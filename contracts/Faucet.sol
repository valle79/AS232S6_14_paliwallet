// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Faucet is Ownable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    IERC20 public token;
    uint256 public dripAmount;
    uint256 public cooldown;
    uint256 public gasRefund;

    mapping(address => uint256) public lastClaimTime;
    mapping(address => bool) public relayers;
    mapping(address => uint256) public nonces;

    event TokensClaimed(address indexed user, uint256 amount);
    event GasRefunded(address indexed user, uint256 amount);
    event RelayerUpdated(address indexed relayer, bool active);
    event DripUpdated(uint256 oldAmount, uint256 newAmount);
    event CooldownUpdated(uint256 oldValue, uint256 newValue);
    event GasRefundUpdated(uint256 oldValue, uint256 newValue);

    error CooldownActive(uint256 remaining);
    error NoFunds();
    error InvalidSignature();
    error SignatureExpired();

    constructor(
        address _token,
        uint256 _dripAmount,
        uint256 _cooldown,
        uint256 _gasRefund
    ) Ownable(msg.sender) EIP712("Faucet", "1") {
        token = IERC20(_token);
        dripAmount = _dripAmount;
        cooldown = _cooldown;
        gasRefund = _gasRefund;
    }

    modifier updateCooldown(address user) {
        if (block.timestamp < lastClaimTime[user] + cooldown) {
            revert CooldownActive(
                (lastClaimTime[user] + cooldown) - block.timestamp
            );
        }
        lastClaimTime[user] = block.timestamp;
        _;
    }

    function claim() external nonReentrant updateCooldown(msg.sender) {
        _dispense(msg.sender);
    }

    function claimFor(
        address user
    ) external nonReentrant updateCooldown(user) {
        if (msg.sender != owner() && !relayers[msg.sender]) {
            revert("not authorized");
        }
        _dispense(user);
    }

    function claimGasless(
        address user,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant updateCooldown(user) {
        if (block.timestamp > deadline) revert SignatureExpired();

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Claim(address user,uint256 nonce,uint256 deadline)"
                ),
                user,
                nonces[user]++,
                deadline
            )
        );

        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        if (signer != user) revert InvalidSignature();

        _dispense(user);
    }

    function _dispense(address user) internal {
        uint256 balance = token.balanceOf(address(this));
        if (balance < dripAmount) revert NoFunds();

        token.safeTransfer(user, dripAmount);

        if (gasRefund > 0 && address(this).balance >= gasRefund) {
            (bool ok, ) = payable(user).call{value: gasRefund}("");
            if (ok) emit GasRefunded(user, gasRefund);
        }

        emit TokensClaimed(user, dripAmount);
    }

    function setDripAmount(uint256 _dripAmount) external onlyOwner {
        uint256 old = dripAmount;
        dripAmount = _dripAmount;
        emit DripUpdated(old, _dripAmount);
    }

    function setCooldown(uint256 _cooldown) external onlyOwner {
        uint256 old = cooldown;
        cooldown = _cooldown;
        emit CooldownUpdated(old, _cooldown);
    }

    function setGasRefund(uint256 _gasRefund) external onlyOwner {
        uint256 old = gasRefund;
        gasRefund = _gasRefund;
        emit GasRefundUpdated(old, _gasRefund);
    }

    function setRelayer(address relayer, bool active) external onlyOwner {
        relayers[relayer] = active;
        emit RelayerUpdated(relayer, active);
    }

    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
    }

    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool ok, ) = payable(owner()).call{value: balance}("");
        require(ok, "withdraw failed");
    }

    receive() external payable {}
}
