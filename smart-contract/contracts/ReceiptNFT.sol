// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ReceiptNFT is ERC721, Ownable {

    mapping(uint256 => string) private _tokenURIs;

    uint256 private _nextId;
    address public linkUp;

    modifier onlyLinkUp() {
        require(msg.sender == linkUp, "Not authorized");
        _;
    }

    

    function setLinkUp(address _linkUp) external onlyOwner {
        require(_linkUp != address(0), "invalid");
        linkUp = _linkUp;
    }

	constructor(address _linkup_address) ERC721("LinkUp Receipt", "LUR") Ownable(msg.sender) {
        linkUp = _linkup_address;
    }

    function mintReceipt(address to, string calldata metadataURI)
        external 
        onlyLinkUp 
        returns (uint256)
    {
        uint256 tokenId = ++_nextId;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = metadataURI;
        return tokenId;
    }

    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Invalid tokenId");
        return _tokenURIs[tokenId];
    }
}
