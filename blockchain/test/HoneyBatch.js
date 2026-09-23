const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HoneyBatch ERC721", function () {
  let HoneyBatch, honeyBatch;
  let owner, kvicAdmin, beekeeper, consumer;

  beforeEach(async function () {
    [owner, kvicAdmin, beekeeper, consumer] = await ethers.getSigners();
    HoneyBatch = await ethers.getContractFactory("HoneyBatch");
    honeyBatch = await HoneyBatch.deploy();
    
    // In Hardhat config/deploy, owner usually sets up roles. 
    const KVIC_ROLE = await honeyBatch.KVIC_ROLE();
    const BEEKEEPER_ROLE = await honeyBatch.BEEKEEPER_ROLE();
    
    await honeyBatch.grantRole(KVIC_ROLE, kvicAdmin.address);
    await honeyBatch.grantRole(BEEKEEPER_ROLE, beekeeper.address);
  });

  it("Should deploy and set roles correctly", async function () {
    const BEEKEEPER_ROLE = await honeyBatch.BEEKEEPER_ROLE();
    expect(await honeyBatch.hasRole(BEEKEEPER_ROLE, beekeeper.address)).to.be.true;
  });

  it("Should allow beekeeper to mint a batch", async function () {
    const tx = await honeyBatch.connect(beekeeper).mintBatch(
      consumer.address, 
      "ipfs://mockCID123",
      "Wildflower"
    );
    await tx.wait();
    
    expect(await honeyBatch.ownerOf(0)).to.equal(consumer.address);
    expect(await honeyBatch.tokenURI(0)).to.equal("ipfs://mockCID123");
  });

  it("Should reject unauthorized minting", async function () {
    await expect(
      honeyBatch.connect(consumer).mintBatch(consumer.address, "ipfs://test", "Wildflower")
    ).to.be.revertedWithCustomError(honeyBatch, "AccessControlUnauthorizedAccount");
  });

  it("Should allow admin to revoke and preserve state", async function () {
    // Mint
    await honeyBatch.connect(beekeeper).mintBatch(consumer.address, "ipfs://mockCID", "Wildflower");
    
    // Revoke
    await honeyBatch.connect(kvicAdmin).revokeBatch(0, "Contaminated");
    expect(await honeyBatch.isBatchValid(0)).to.be.false;
  });

  it("Should reject unauthorized revocation", async function () {
    await honeyBatch.connect(beekeeper).mintBatch(consumer.address, "ipfs://mockCID", "Wildflower");
    
    await expect(
      honeyBatch.connect(beekeeper).revokeBatch(0, "Test")
    ).to.be.revertedWithCustomError(honeyBatch, "AccessControlUnauthorizedAccount");
  });
});
