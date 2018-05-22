pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";



contract Whitelist is Ownable {

  event AddressWhitelisted(address added, string indexed country);

  /**
   * Maps ISO 3166-1 Country Codes to a list of addresses assigned to that country
   */
  mapping (bytes2 => address[]) authorityMapping; 

  /**
   * Maps addresses to a boolean, indicating whether or not an address 
   * is whitelisted
   */
  mapping (address => bool) whitelist; 

  /**
   * Maps addresses to the countries they are located in
   */
  mapping (address => bytes2) authorityToCountry;


  /**
   * Blocks all addresses mapped to false in the whitelist mapping.
   */
  modifier onlyWhitelisted(){
    require(whitelist[msg.sender]);
    _; 
  }

  /**
   * Requires an address to belong to a specific country to proceed. 
   */
  modifier whitelistedForCountry(bytes2 countryCode, address addr) {
    require(authorityToCountry[addr]==countryCode);
    _;
  }


}


