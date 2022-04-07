'use strict';

const {createNetwork: createChain, relay, getGasCost, getFee} = require('../../dist/networkUtils.js');
const { deployContract } = require('../../dist/utils.js');
const { utils : {defaultAbiCoder}, constants: {AddressZero}, BigNumber } = require('ethers');

const ExecutableSample = require('../../build/ExecutableSample.json');
const ERC4626Vault = require('../../build/ERC4626Vault.json');
const SampleStrategy = require('../../build/SampleStrategy.json');

(async () => {
    // Create two chains and get a funded user for each
    const chain1 = await createChain({ seed: "chain1" });
    const [user1] = chain1.userWallets;
    const chain2 = await createChain({ seed: "chain2" , ganacheOptions: {}});
    const [user2] = chain2.userWallets;


    // Deploy sample Vault
    const vault = await deployContract(user1, ERC4626Vault, [chain1.ust.address])

    // Deploy our IAxelarExecutable Strategy contracts
    const st1 = await deployContract(user1, SampleStrategy, [vault.address, chain1.ust.address, chain1.gateway.address, chain1.gasReceiver.address]);
    const st2 = await deployContract(user2, SampleStrategy, [AddressZero, chain2.ust.address, chain2.gateway.address, chain2.gasReceiver.address]);
    
    // Inform our exeuctables about each other.
    await (await st1.connect(user1).addSibling(chain2.name, st2.address)).wait();
    await (await st2.connect(user2).addSibling(chain1.name, st1.address)).wait();

    // attach sample Strategy to vault
    await vault.connect(user1).updateStrategy(st1.address)
    
    // Get some UST on chain1.
    await chain1.giveToken(user1.address, 'UST', 10000000);

    // This is used for logging.
    const print = async () => {
        console.log(`user1 has ${await chain1.ust.balanceOf(user1.address)} UST.`);
        console.log(`user2 has ${await chain2.ust.balanceOf(user2.address)} UST.`);
        console.log(`st1: ${await st1.value()}`);
        console.log(`st2: ${await st2.value()}`);
        console.log(`Vault has: ${await chain1.ust.balanceOf(vault.address)} UST.`);
        console.log(`Strategy has: ${await chain1.ust.balanceOf(st1.address)} UST.`);
        console.log(`user1 has ${await chain1.ust.balanceOf(user1.address)} UST.`);
    }

    console.log('--- Initially ---');
    await print();

    const gasLimit = 11473448;
    const gasPrice = new BigNumber.from("20000000000");
    const gasCost = getGasCost(chain1, chain2, AddressZero);

    // Approve and deposit Vault
    await(await chain1.ust.connect(user1).approve(vault.address, 100000000)).wait();
    await(await vault.connect(user1).deposit(10000, vault.address, { gasLimit:gasLimit, gasPrice: gasPrice})).wait();

    await print();
    // Approve the AxelarGateway to use our UST on chain1.
    await (await chain1.ust.connect(user1).approve(chain1.gateway.address, 5000000)).wait();
    // And have it send it to chain2.
    await (await chain1.gateway.connect(user1).sendToken(chain2.name, user2.address, 'UST', 5000000)).wait();
    // This facilitates the send.
    await relay();
    // After which the funds have reached chain2
    console.log('--- After Sending Token ---');
    await print();
    // Set the value on chain1. This will also cause the value on chain2 to change after relay() is called.
    await (await st1.connect(user1).set(chain2.name, 'Hello World!', {value: gasLimit * gasCost})).wait();
    console.log('--- After Setting but Before Relay---');
    await print();
    // Updates the value on chain2 also.
    await relay();
    console.log('--- After Setting and Relaying---');
    await print();
})();