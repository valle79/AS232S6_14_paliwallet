import { json } from '@sveltejs/kit';
import { ethers } from 'ethers';
import { FAUCET_NETWORKS, FAUCET_ABI, TOKEN_MIN_ABI } from '$lib/config/faucetConfig';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
  try {
    const { address, chainId } = await request.json();

    if (!address || !chainId) {
      return json({ error: 'Address and chainId are required' }, { status: 400 });
    }

    if (!ethers.isAddress(address)) {
      return json({ error: 'Invalid EVM address' }, { status: 400 });
    }

    const faucetPk = env.FAUCET_PRIVATE_KEY;
    const faucetAmount = env.FAUCET_AMOUNT;

    if (!faucetPk) {
      return json({
        error: 'Faucet no configurado',
        detail: 'La variable FAUCET_PRIVATE_KEY no está definida en el entorno'
      }, { status: 503 });
    }

    const faucet = FAUCET_NETWORKS.find(
      f => f.chainId.toString() === chainId.toString() && f.isActive
    );

    if (!faucet) {
      return json({ error: `No hay faucet disponible para chain ${chainId}` }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(faucet.rpcUrl);
    const wallet = new ethers.Wallet(faucetPk, provider);
    const amount = faucetAmount || faucet.dripAmount;

    let tx;
    let currency = faucet.currency;
    let tokenSymbol = faucet.currency;

    if (faucet.contractAddress && faucet.faucetType === 'erc20') {
      const contract = new ethers.Contract(faucet.contractAddress, FAUCET_ABI, wallet);
      try {
        const tokenAddr = await contract.token();
        if (tokenAddr && ethers.isAddress(tokenAddr)) {
          const tokenContract = new ethers.Contract(tokenAddr, TOKEN_MIN_ABI, provider);
          tokenSymbol = await tokenContract.symbol();
          currency = tokenSymbol;
        }
      } catch {
        // fallback to config currency
      }
      tx = await contract.claimFor(address);
    } else if (faucet.contractAddress) {
      const amountWei = ethers.parseEther(amount);
      const contract = new ethers.Contract(faucet.contractAddress, FAUCET_ABI, wallet);
      tx = await contract.requestTokens(address, { value: amountWei });
    } else {
      const amountWei = ethers.parseEther(amount);
      const balance = await provider.getBalance(wallet.address);
      if (balance < amountWei) {
        return json({
          error: 'La wallet del faucet no tiene suficiente balance',
          detail: `Necesita ${amount} ${faucet.currency}, tiene ${ethers.formatEther(balance)} ${faucet.currency}`
        }, { status: 503 });
      }
      tx = await wallet.sendTransaction({
        to: address,
        value: amountWei
      });
    }

    const receipt = await tx.wait();

    return json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      amount,
      currency,
      network: faucet.networkName,
      tokenSymbol,
      faucetType: faucet.faucetType || 'native',
      explorerUrl: faucet.blockExplorerUrl
        ? `${faucet.blockExplorerUrl}/tx/${tx.hash}`
        : null
    });

  } catch (error: any) {
    console.error('Faucet error:', error);

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return json({
        error: 'La wallet del faucet no tiene fondos suficientes para cubrir el gas de la transacción',
      }, { status: 503 });
    }

    if (error.code === 'CALL_EXCEPTION') {
      let detail = 'La transacción al contrato falló.';
      if (error.reason) {
        detail += ` Razón: ${error.reason}`;
        if (error.reason.includes('not authorized')) {
          detail += ' La wallet del servidor no está autorizada como relayer. Llama a setRelayer() en el contrato.';
        } else if (error.reason.includes('CooldownActive')) {
          detail += ' El usuario ya reclamó recientemente. Espera el cooldown.';
        } else if (error.reason.includes('NoFunds')) {
          detail += ' El contrato no tiene tokens. Fondea el contrato con tokens primero.';
        }
      } else if (error.data) {
        detail += ' Revisa que el contrato tenga fondos y que el método exista.';
      }
      return json({ error: detail }, { status: 502 });
    }

    if (error.code === 'NETWORK_ERROR' || error?.reason?.includes('bad response')) {
      return json({
        error: 'El RPC de la red no está disponible en este momento. Intenta más tarde.',
        detail: error.message
      }, { status: 503 });
    }

    return json({
      error: error.message || 'Error al procesar la solicitud del faucet',
    }, { status: 500 });
  }
}
