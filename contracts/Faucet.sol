// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Faucet {
    address public owner;
    uint256 public dripAmount;
    uint256 public cooldown;

    mapping(address => uint256) public lastRequest;

    event TokensClaimed(address indexed recipient, uint256 amount);
    event OwnershipTransferred(address indexed previous, address indexed next);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(uint256 _dripAmount, uint256 _cooldownSecs) payable {
        owner = msg.sender;
        dripAmount = _dripAmount;
        cooldown = _cooldownSecs;
    }

    function requestTokens(address recipient) external onlyOwner {
        require(recipient != address(0), "addr zero");
        require(block.timestamp >= lastRequest[recipient] + cooldown, "cooldown");
        require(address(this).balance >= dripAmount, "no funds");

        lastRequest[recipient] = block.timestamp;
        (bool ok,) = payable(recipient).call{value: dripAmount}("");
        require(ok, "send fail");

        emit TokensClaimed(recipient, dripAmount);
    }

    function setDrip(uint256 _amount) external onlyOwner {
        dripAmount = _amount;
    }

    function setCooldown(uint256 _secs) external onlyOwner {
        cooldown = _secs;
    }

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "addr zero");
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function withdraw() external onlyOwner {
        (bool ok,) = payable(owner).call{value: address(this).balance}("");
        require(ok, "withdraw fail");
    }

    receive() external payable {}
}
