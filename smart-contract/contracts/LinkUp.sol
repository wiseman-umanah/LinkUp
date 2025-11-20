// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReceiptNFT.sol";

contract LinkUp is Ownable, ReentrancyGuard {
    ReceiptNFT public receiptNft;
    
    error PaymentAlreadyExists();
    error PaymentNotFound();
    error NotSeller();
    error AlreadyInactive();
    error InactiveLink();
    error IncorrectAmount();

    event PaymentCreated(
        string indexed id,
        address indexed seller,
        uint256 amountWei
    );

    event PaymentDeactivated(
        string indexed id,
        address indexed seller
    );

    event PaymentPaid(
        string indexed id,
        address indexed payer,
        address indexed seller,
        uint256 priceWei,
        uint256 feeWei,
        uint256 totalWei
    );

    event PlatformTreasuryUpdated(address oldTreasury, address newTreasury);
    event PlatformFeeUpdated(uint16 oldFeeBps, uint16 newFeeBps);

    address payable public platformTreasury;

    uint16 public platformFeeBps;

    struct Payment {
        string  id;
        address seller;
        uint256 amountWei;
        bool    active;
    }

    mapping(bytes32 => Payment) private payments;

    mapping(address => uint256) public sellerEarningsWei;

    constructor(address payable _platformTreasury, uint16 _platformFeeBps) Ownable(msg.sender){
        require(_platformTreasury != address(0), "treasury=0");
        require(_platformFeeBps <= 10_000, "fee>100%");
        platformTreasury = _platformTreasury;
        platformFeeBps = _platformFeeBps;
    }

    function setReceiptNft(address receiptNftAddress) external onlyOwner {
        require(receiptNftAddress != address(0), "receipt=0");
        receiptNft = ReceiptNFT(receiptNftAddress);
    }

    function _idKey(string memory id) internal pure returns (bytes32) {
        return keccak256(bytes(id));
    }

    function calculateFee(uint256 priceWei) public view returns (uint256) {
        return (priceWei * platformFeeBps) / 10_000;
    }

    function updateTreasury(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "treasury=0");
        emit PlatformTreasuryUpdated(platformTreasury, newTreasury);
        platformTreasury = newTreasury;
    }

    function updatePlatformFee(uint16 newFeeBps) external onlyOwner {
        require(newFeeBps <= 10_000, "fee>100%");
        emit PlatformFeeUpdated(platformFeeBps, newFeeBps);
        platformFeeBps = newFeeBps;
    }

    function getPayment(string calldata id) external view returns (Payment memory p) {
        p = payments[_idKey(id)];
        if (p.seller == address(0)) revert PaymentNotFound();
    }

    function quotePayment(string calldata id)
        external
        view
        returns (uint256 priceWei, uint256 feeWei, uint256 totalWei)
    {
        Payment memory p = payments[_idKey(id)];
        if (p.seller == address(0)) revert PaymentNotFound();

        priceWei = p.amountWei;
        feeWei = calculateFee(priceWei);
        totalWei = priceWei + feeWei;
    }

    function createPayment(string calldata id, uint256 amountWei) external {
        if (amountWei == 0) revert IncorrectAmount();

        bytes32 key = _idKey(id);
        if (payments[key].seller != address(0)) revert PaymentAlreadyExists();

        payments[key] = Payment({
            id: id,
            seller: msg.sender,
            amountWei: amountWei,
            active: true
        });

        emit PaymentCreated(id, msg.sender, amountWei);
    }

    function deactivatePayment(string calldata id) external {
        bytes32 key = _idKey(id);
        Payment storage p = payments[key];

        if (p.seller == address(0)) revert PaymentNotFound();
        if (p.seller != msg.sender) revert NotSeller();
        if (!p.active) revert AlreadyInactive();

        p.active = false;

        emit PaymentDeactivated(id, msg.sender);
    }

    function pay(string calldata id, string calldata metadataURI)
        external
        payable
        nonReentrant
    {
        bytes32 key = _idKey(id);
        Payment storage p = payments[key];

        if (p.seller == address(0)) revert PaymentNotFound();
        if (!p.active) revert InactiveLink();

        uint256 price = p.amountWei;
        uint256 fee   = calculateFee(price);
        uint256 total = price + fee;

        if (msg.value != total) revert IncorrectAmount();

        (bool ok1, ) = platformTreasury.call{value: fee}("");
        require(ok1, "fee xfer failed");

        (bool ok2, ) = payable(p.seller).call{value: price}("");
        require(ok2, "seller xfer failed");

        sellerEarningsWei[p.seller] += price;

        emit PaymentPaid(
            id,
            msg.sender,
            p.seller,
            price,
            fee,
            total
        );

        require(address(receiptNft) != address(0), "receipt not set");

        receiptNft.mintReceipt(
            msg.sender,
            metadataURI
        );
    }
}
