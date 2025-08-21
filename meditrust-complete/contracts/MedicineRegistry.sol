// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IMediToken {
    function mint(address to, uint256 amount) external;
}

/**
 * @title MedicineRegistry
 * @dev Registry for medicine batches with state channel integration + MEDI rewards
 */
contract MedicineRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant CHANNEL_ROLE = keccak256("CHANNEL_ROLE");

    struct MedicineBatch {
        address manufacturer;
        string batchId;
        string drugName;
        string ingredients;
        uint256 productionDate;
        uint256 expiryDate;
        string ipfsHash;
        uint8 status; // 0: Active, 1: Expired, 2: Recalled, 3: Flagged
        uint256 createdAt;
        bytes32 channelId;
    }

    struct ChannelInfo {
        address participant1;
        address participant2;
        uint256 deposit; // in ETH for simplicity
        bool isActive;
        uint256 openedAt;
    }

    // Storage
    mapping(string => MedicineBatch) public batches;
    mapping(bytes32 => ChannelInfo) public channels;
    mapping(address => uint256) public manufacturerDeposits;
    mapping(address => uint256) public pendingRewards;

    // Token contract
    IMediToken public mediToken;

    // Constants
    uint256 public constant SCAN_REWARD = 1 ether;  // 1 MEDI (18 decimals)
    uint256 public constant REPORT_REWARD = 10 ether; // 10 MEDI
    uint256 public constant MIN_DEPOSIT = 100 ether; // 100 MEDI min

    // Events
    event BatchRegistered(string indexed batchId, address indexed manufacturer, bytes32 channelId);
    event ChannelOpened(bytes32 indexed channelId, address participant1, address participant2, uint256 deposit);
    event ChannelClosed(bytes32 indexed channelId, uint256 finalBalance);
    event RewardDistributed(address indexed recipient, uint256 amount, string reason);
    event BatchStatusUpdated(string indexed batchId, uint8 newStatus);

    constructor(address _mediToken) {
        mediToken = IMediToken(_mediToken);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CHANNEL_ROLE, msg.sender);
    }

    // ============ Manufacturer Functions ============

    function registerManufacturer(address _manufacturer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MANUFACTURER_ROLE, _manufacturer);
    }

    function depositFunds() external payable onlyRole(MANUFACTURER_ROLE) {
        require(msg.value >= MIN_DEPOSIT, "Insufficient deposit");
        manufacturerDeposits[msg.sender] += msg.value;
    }

    function registerBatch(
        string memory _batchId,
        string memory _drugName,
        string memory _ingredients,
        uint256 _productionDate,
        uint256 _expiryDate,
        string memory _ipfsHash
    ) external onlyRole(MANUFACTURER_ROLE) whenNotPaused {
        require(bytes(batches[_batchId].batchId).length == 0, "Batch exists");
        require(_expiryDate > block.timestamp, "Invalid expiry");
        require(manufacturerDeposits[msg.sender] >= MIN_DEPOSIT, "Deposit too low");

        // Generate channel ID
        bytes32 channelId = keccak256(abi.encodePacked(_batchId, msg.sender, block.timestamp));

        batches[_batchId] = MedicineBatch({
            manufacturer: msg.sender,
            batchId: _batchId,
            drugName: _drugName,
            ingredients: _ingredients,
            productionDate: _productionDate,
            expiryDate: _expiryDate,
            ipfsHash: _ipfsHash,
            status: 0,
            createdAt: block.timestamp,
            channelId: channelId
        });

        channels[channelId] = ChannelInfo({
            participant1: msg.sender,
            participant2: address(this),
            deposit: MIN_DEPOSIT,
            isActive: true,
            openedAt: block.timestamp
        });

        manufacturerDeposits[msg.sender] -= MIN_DEPOSIT;

        emit BatchRegistered(_batchId, msg.sender, channelId);
        emit ChannelOpened(channelId, msg.sender, address(this), MIN_DEPOSIT);
    }

    // ============ Channel Functions ============

    function openChannel(address p1, address p2, uint256 deposit) external onlyRole(CHANNEL_ROLE) returns (bytes32) {
        bytes32 channelId = keccak256(abi.encodePacked(p1, p2, block.timestamp));

        channels[channelId] = ChannelInfo({
            participant1: p1,
            participant2: p2,
            deposit: deposit,
            isActive: true,
            openedAt: block.timestamp
        });

        emit ChannelOpened(channelId, p1, p2, deposit);
        return channelId;
    }

    function closeChannel(bytes32 channelId) external onlyRole(CHANNEL_ROLE) nonReentrant {
        ChannelInfo storage ch = channels[channelId];
        require(ch.isActive, "Not active");

        ch.isActive = false;

        uint256 remaining = ch.deposit;
        if (remaining > 0) {
            (bool ok, ) = payable(ch.participant1).call{value: remaining}("");
            require(ok, "Transfer failed");
        }

        emit ChannelClosed(channelId, remaining);
    }

    // ============ Rewards ============

    function distributeScanReward(address scanner, string memory batchId) external onlyRole(CHANNEL_ROLE) {
        require(bytes(batches[batchId].batchId).length > 0, "Batch missing");
        pendingRewards[scanner] += SCAN_REWARD;
        emit RewardDistributed(scanner, SCAN_REWARD, "scan");
    }

    function distributeReportReward(address reporter) external onlyRole(CHANNEL_ROLE) {
        pendingRewards[reporter] += REPORT_REWARD;
        emit RewardDistributed(reporter, REPORT_REWARD, "report");
    }

    function claimRewards() external nonReentrant {
        uint256 reward = pendingRewards[msg.sender];
        require(reward > 0, "No rewards");

        pendingRewards[msg.sender] = 0;
        mediToken.mint(msg.sender, reward);

        emit RewardDistributed(msg.sender, reward, "claim");
    }

    // ============ Queries ============

    function getBatch(string memory _batchId) external view returns (MedicineBatch memory) {
        return batches[_batchId];
    }

    function getChannel(bytes32 channelId) external view returns (ChannelInfo memory) {
        return channels[channelId];
    }

    function checkBatchValidity(string memory _batchId) external view returns (bool isValid, string memory reason) {
        MedicineBatch memory batch = batches[_batchId];

        if (bytes(batch.batchId).length == 0) return (false, "Not found");
        if (batch.status != 0) {
            if (batch.status == 1) return (false, "Expired");
            if (batch.status == 2) return (false, "Recalled");
            if (batch.status == 3) return (false, "Flagged counterfeit");
        }
        if (block.timestamp > batch.expiryDate) return (false, "Past expiry");

        return (true, "Valid");
    }

    // ============ Admin ============

    function updateBatchStatus(string memory _batchId, uint8 newStatus) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(batches[_batchId].batchId).length > 0, "Batch missing");
        require(newStatus <= 3, "Invalid status");

        batches[_batchId].status = newStatus;
        emit BatchStatusUpdated(_batchId, newStatus);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function withdrawEmergency() external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool ok, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    receive() external payable {}
}
