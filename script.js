let xp=0;
let health=100;
let gold=50;
let currentWeapon=0;
let fighting;
let monsterHealth;
let inventory=["stick"];
const button1= document.querySelector("#button1");
const button2= document.querySelector("#button2");
const button3= document.querySelector("#button3");
const text= document.querySelector("#text");
const xpText= document.querySelector("#xp");
const healthText= document.querySelector("#healthText");
const goldText= document.querySelector("#goldText");
const monsterStats= document.querySelector("#monsterStats");
const monsterNameText= document.querySelector("#monsterName");
const monsterHealthText= document.querySelector("#monsterHealth");

//comment
/* thisf
nigger
*/
function update(location);{
    
}

button1.onclick=goStore;
button2.onclick=goCave;
button3.onclick=fightDragon;
function goStore()  {
   button1.innerText="Buy 10 health(10 gold)";
   button2.innerText="Buy weapon(30 gold)";
    button3.innerText="Go to town square";
    button1.onclick= buyHealth;
    button2.onclick=buyWeapon;
    button3.onclick=goTownSquare;
    text.innerText="Welcome to the store! What would you like to do?";
}
function goCave()  {
    console.log("Going to cave");
}
function fightDragon()  {
    console.log("Fighting dragon");
   
}
function buyHealth() {
}
function buyWeapon() {

}
function goTownSquare() {
    button1.innerText="Go to store";
    button2.innerText="Go to cave";
    button3.innerText="Fight dragon";
    button1.onclick=goStore;
    button2.onclick=goCave;
    button3.onclick=fightDragon;
    text.innerText="You are in the town square. You see a sign that says \"store\".";
}