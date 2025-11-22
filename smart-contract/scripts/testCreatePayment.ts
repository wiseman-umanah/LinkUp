import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const [seller] = await ethers.getSigners();
  console.log("Using local signer:", seller.address);

  const LinkUp = await ethers.getContractFactory("LinkUp");
  const linkup = await LinkUp.deploy(seller.address, 200);
  await linkup.waitForDeployment();
  console.log("Deployed LinkUp at:", await linkup.getAddress());

  const slug = `test-${Date.now()}`;
  const amount = ethers.parseUnits("1", 18); // 1 HBAR when testing locally
  console.log(`Calling createPayment("${slug}", ${amount})`);
  const tx = await linkup.connect(seller).createPayment(slug, amount);
  await tx.wait();
  console.log("createPayment succeeded:", tx.hash);

  const payment = await linkup.getPayment(slug);
  console.log("Sample payment lookup:", payment);
}

main().catch((err) => {
  console.error("Error running local LinkUp test:", err);
  process.exit(1);
});
