// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract HoneyBatch is ERC721URIStorage, AccessControl {
    bytes32 public constant KVIC_ROLE = keccak256("KVIC_ROLE");
    bytes32 public constant BEEKEEPER_ROLE = keccak256("BEEKEEPER_ROLE");

    uint256 private _nextTokenId;

    // Additional batch metadata for quick on-chain queries
    struct BatchMetadata {
        address beekeeper;
        string floralSource;
        uint256 extractionDate;
    }

    mapping(uint256 => BatchMetadata) public batchDetails;
    mapping(uint256 => bool) public isBatchValid;

    event BatchMinted(uint256 indexed tokenId, address indexed beekeeper, string ipfsURI);
    event BatchRevoked(uint256 indexed tokenId, string reason);

    constructor() ERC721("HoneyChainBatch", "HCB") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KVIC_ROLE, msg.sender);
    }

    /**
     * @dev Mints a new Honey Batch NFT.
     * @param beekeeper The address of the beekeeper.
     * @param ipfsURI The IPFS CID URI containing detailed batch JSON (images, lab reports, telemetry logs).
     * @param floralSource Short string defining the nectar source.
     */
    function mintBatch(address beekeeper, string memory ipfsURI, string memory floralSource) 
        public 
        onlyRole(BEEKEEPER_ROLE) 
        returns (uint256) 
    {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(beekeeper, tokenId);
        _setTokenURI(tokenId, ipfsURI);
        
        batchDetails[tokenId] = BatchMetadata({
            beekeeper: beekeeper,
            floralSource: floralSource,
            extractionDate: block.timestamp
        });
        
        isBatchValid[tokenId] = true;

        emit BatchMinted(tokenId, beekeeper, ipfsURI);
        return tokenId;
    }

    /**
     * @dev Allows a KVIC admin to revoke a batch if contamination is found.
     */
    function revokeBatch(uint256 tokenId, string memory reason) public onlyRole(KVIC_ROLE) {
        require(isBatchValid[tokenId], "Batch already revoked or invalid");
        isBatchValid[tokenId] = false;
        emit BatchRevoked(tokenId, reason);
    }

    // Required overrides by Solidity for inheriting from multiple OpenZeppelin contracts
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
