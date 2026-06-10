import { json } from '@sveltejs/kit';
import { ethers } from 'ethers';
import { FAUCET_NETWORKS } from '$lib/config/faucetConfig';
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
    const amountWei = ethers.parseEther(amount);

    const balance = await provider.getBalance(wallet.address);

    if (balance < amountWei) {
      return json({
        error: 'La wallet del faucet no tiene suficiente balance',
        detail: `Necesita ${amount} ${faucet.currency}, tiene ${ethers.formatEther(balance)} ${faucet.currency}`
      }, { status: 503 });
    }

    // Enviar sin especificar gas — ethers resuelve automáticamente
    // el gasPrice, gasLimit y tipo de transacción según la red
    const tx = await wallet.sendTransaction({
      to: address,
      value: amountWei
    });

    const receipt = await tx.wait();

    return json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      amount,
      currency: faucet.currency,
      network: faucet.networkName,
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

    return json({
      error: error.message || 'Error al procesar la solicitud del faucet',
    }, { status: 500 });
  }
}
