"use strict";

/*===============================
              RISK             
===============================*/

//SVG map adapted from https://commons.wikimedia.org/wiki/File:Risk_board.svg
//Built using svg, sass and plain javascript

/* Instructions

Aim: To control all the areas on the map
You control the dark blue areas

Every turn you get additional troops to place on the map. 
The number of troops is increased by:
  * Owning more areas
  * Increases slightly after each turn
  * Controlling all areas on a continent
To place a troop click on an area you control when it's the fortify stage 
  
Once your reserve is 0 the stage changes to the battle stage.

To attack an opponent select an area you control to attack from and a neighbouring opponent to attack
You must have a least one troop to attack an opponent.
If you win the opponents territory will become yours and remaining troops will split between the two areas
If you lose the troops in your area will become 0

Click 'End Turn' to continue the game and pass control to the AI

*/

/* Data */

var continents = [{
    areas: ["Indonesia", "New Guinea", "Eastern Australia", "Western Australia"],
    name: "Oceania",
    bonus: 4
}, {
    areas: ["Brazil", "Peru", "Colombia", "Argentina"],
    name: "South America",
    bonus: 6
}, {
    areas: ["Egypt", "North Africa", "East Africa", "Congo", "South Africa", "Madagascar"],
    name: "Africa",
    bonus: 3
}, {
    areas: ["Iceland", "United Kingdom", "Scandinavia", "Northern Europe", "Spain", "Ukraine", "Southern Europe"],
    name: "Europe",
    bonus: 8
}, {
    areas: ["Mexico", "Eastern USA", "Western USA", "Quebec", "Ontario", "Alberta", "Northwest Territory", "Alaska", "Greenland"],
    name: "North America",
    bonus: 10
}, {
    areas: ["Middle East", "Afghanistan", "Ural", "Siberia", "Irkutsk", "Yakutsk", "Kamchatka", "Mongolia", "Japan", "China", "Siam", "India"],
    name: "Asia",
    bonus: 7
}];

var countries = [{ name: "Indonesia", continent: "Oceania", owner: "none", color: "white", "army": 0, neighbours: ["Siam", "Western Australia", "New Guinea"] }, 
{ name: "New Guinea", continent: "Oceania", owner: "none", color: "white", "army": 0, neighbours: ["Indonesia", "Eastern Australia", "Western Australia"] }, 
{ name: "Eastern Australia", continent: "Oceania", owner: "none", color: "white", "army": 0, neighbours: ["Western Australia", "New Guinea"] }, 
{ name: "Western Australia", continent: "Oceania", owner: "none", color: "white", "army": 0, neighbours: ["Eastern Australia", "New Guinea", "Indonesia"] }, 
{ name: "Ural", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Ukraine", "Siberia", "Afghanistan", "China"] }, 
{ name: "Siberia", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Ural", "Mongolia", "Yakutsk", "Irkutsk", "China"] }, 
{ name: "Afghanistan", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Ukraine", "Ural", "Middle East", "China", "India"] }, 
{ name: "Irkutsk", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Yakutsk", "Siberia", "Kamchatka", "Mongolia"] }, 
{ name: "Yakutsk", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Irkutsk", "Siberia", "Kamchatka"] }, 
{ name: "Kamchatka", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Alaska", "Yakutsk", "Japan", "Irkutsk", "Mongolia"] }, 
{ name: "Middle East", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Ukraine", "Afghanistan", "India", "Egypt", "East Africa", "Southern Europe"] }, 
{ name: "India", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Middle East", "Siam", "Afghanistan", "China"] }, 
{ name: "Siam", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Indonesia", "India", "China"] }, 
{ name: "China", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Ural", "Siberia", "Afghanistan", "Mongolia", "Siam", "India"] }, 
{ name: "Mongolia", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Irkutsk", "Siberia", "Kamchatka", "China", "Japan"] }, 
{ name: "Japan", continent: "Asia", owner: "none", color: "white", "army": 0, neighbours: ["Kamchatka", "Mongolia"] }, 
{ name: "Egypt", continent: "Africa", owner: "none", color: "white", "army": 0, neighbours: ["Middle East", "Southern Europe", "North Africa", "East Africa"] }, 
{ name: "North Africa", continent: "Africa", owner: "none", color: "white", "army": 0, neighbours: ["Egypt", "Southern Europe", "Western Europe", "East Africa", "Congo", "Brazil"] }, 
{ name: "East Africa", continent: "Africa", owner: "none", color: "white", "army": 0, neighbours: ["Middle East", "Egypt", "North Africa", "Congo", "Madagascar", "South Africa"] }, 
{ name: "Congo", continent: "Africa", owner: "none", color: "white", "army": 0, neighbours: ["South Africa", "North Africa", "East Africa"] }, 
{ name: "South Africa", continent: "Africa", owner: "none", color: "white", "army": 0, neighbours: ["Congo", "Madagascar", "East Africa"] }, 
{ name: "Madagascar", continent: "Africa", owner: "none", color: "white", "army": 0, neighbours: ["South Africa", "East Africa"] }, 
{ name: "Brazil", continent: "South America", owner: "none", color: "white", "army": 0, neighbours: ["Peru", "Argentina", "North Africa", "Colombia"] }, 
{ name: "Peru", continent: "South America", owner: "none", color: "white", "army": 0, neighbours: ["Brazil", "Argentina", "Colombia"] }, 
{ name: "Argentina", continent: "South America", owner: "none", color: "white", "army": 0, neighbours: ["Brazil", "Peru"] }, 
{ name: "Colombia", continent: "South America", owner: "none", color: "white", "army": 0, neighbours: ["Brazil", "Peru", "Mexico"] }, 
{ name: "Iceland", continent: "Europe", owner: "none", color: "white", "army": 0, neighbours: ["Greenland", "United Kingdom", "Scandinavia"] }, 
{ name: "Scandinavia", continent: "Europe", owner: "none", color: "white", "army": 0, neighbours: ["Iceland", "United Kingdom", "Ukraine", "Northern Europe"] }, 
{ name: "Northern Europe", continent: "Europe", owner: "none", color: "white", "army": 0, neighbours: ["Ukraine", "United Kingdom", "Scandinavia", "Southern Europe", "Spain"] }, 
{ name: "Spain", continent: "Europe", owner: "none", color: "white", "army": 0, neighbours: ["North Africa", "United Kingdom", "Northern Europe", "Southern Europe"] }, 
{ name: "Southern Europe", continent: "Europe", owner: "none", color: "white", "army": 0, neighbours: ["North Africa", "Egypt", "Northern Europe", "Spain", "Middle East", "Ukraine"] }, 
{ name: "United Kingdom", continent: "Europe", owner: "none", color: "white", "army": 0, neighbours: ["Spain", "Iceland", "Northern Europe", "Scandinavia"] }, 
{ name: "Ukraine", continent: "Europe", owner: "none", color: "white", "army": 0, neighbours: ["Scandinavia", "Ural", "Northern Europe", "Southern Europe", "Afghanistan", "Middle East"] }, 
{ name: "Greenland", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Iceland", "Quebec", "Ontario", "Northwest Territory"] }, 
{ name: "Mexico", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Colombia", "Eastern USA", "Western USA"] }, 
{ name: "Eastern USA", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Mexico", "Quebec", "Ontario", "Western USA"] }, 
{ name: "Western USA", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Eastern USA", "Mexico", "Ontario", "Alberta"] }, 
{ name: "Alaska", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Kamchatka", "Alberta", "Northwest Territory"] }, 
{ name: "Alberta", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Alaska", "Western USA", "Ontario", "Northwest Territory"] }, 
{ name: "Ontario", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Greenland", "Quebec", "Alberta", "Western USA", "Eastern USA", "Northwest Territory"] },
 { name: "Quebec", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Greenland", "Eastern USA", "Ontario"] }, 
 { name: "Northwest Territory", continent: "North America", owner: "none", color: "white", "army": 0, neighbours: ["Greenland", "Alaska", "Alberta", "Ontario"] }];

var players = [{
    "name": "Onur Genc",
    "country": "BBVA",
    "color": "#08549c",
    "army": 10,
    "reserve": 10,
    "areas": [],
    "bonus": 2,
    "alive": true
}, {
    "name": "Héctor Grisi",
    "country": "Santander",
    "color": "#ff0404",
    "army": 20,
    "reserve": 20,
    "areas": [],
    "bonus": 2,
    "alive": true
}, {
    "name": "P. Collison",
    "country": "Stripe",
    "color": "#7064fc",
    "army": 20,
    "reserve": 20,
    "areas": [],
    "bonus": 2,
    "alive": true
}, { 
    "name": "Ma Huateng",
    "country": "WeChat",
    "color": "#484444",
    "army": 20,
    "reserve": 20,
    "areas": [],
    "bonus": 2,
    "alive": true
}, { "name": "P. Van der Does",
    "country": "Adyen",
    "color": "#40b45c",
    "army": 20,
    "reserve": 20,
    "areas": [],
    "bonus": 2,
    "alive": true
}, { "name": "M. Galperin",
    "country": "MercadoLibre",
    "color": "#ffe404",
    "army": 20,
    "reserve": 20,
    "areas": [],
    "bonus": 2,
    "alive": true
}];

//Helper Functions

Array.prototype.containsArray = function (array) {
    if (arguments[1]) {
        var index = arguments[1],
            last = arguments[2];
    } else {
        var index = 0,
            last = 0;this.sort();array.sort();
    };
    return index == array.length || (last = this.indexOf(array[index], last)) > -1 && this.containsArray(array, ++index, ++last);
};

function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue,
        randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

//DOM Elements

var infoName = Array.from(document.getElementsByClassName('country'));
var infoLeader = Array.from(document.getElementsByClassName('leader'));
var infoIncome = Array.from(document.getElementsByClassName('income'));
var areas = Array.from(document.getElementsByClassName('area'));
var bar = Array.from(document.getElementsByClassName('bar'));

var map = document.querySelector('svg');
//Modals
var modal = document.querySelector('#start-modal');
var reserveDisplay = document.querySelector('#reserve');
var chosenLeader = document.querySelector('#chosen-leader');
var chosenCountry = document.querySelector('#chosen-country');
var submitName = document.querySelector('#submit-name');
var bonusModal = document.querySelector('.bonus-modal');
var bonusModalAmount = document.querySelector('.bonus-modal-amount');
var bonusModalText = document.querySelector('.bonus-modal-text');
var bonusModalPlayer = document.querySelector('.bonus-modal-player');
var winModal = document.querySelector('#win-modal');
var winMessage = document.querySelector('.win-message');
var playAgain = document.querySelector('#play-again');
//Info Panels
var playerName = document.querySelector('.player-name');
var playerCountry = document.querySelector('.player-country');
var restart = document.querySelector('#restart');
var playerPanel = document.querySelector('.player-panel');
var infoPanel = document.querySelector('.info');
var turnInfo = document.querySelector('.turn-info');
var turnInfoMessage = document.querySelector('.turn-info-message');
var end = document.querySelector('#end');

//Create Game Object

var Gamestate = {};

Gamestate.countries = JSON.parse(JSON.stringify(countries)); //Array of Countries on Map
Gamestate.players = JSON.parse(JSON.stringify(players)); //Array of all players
Gamestate.player = JSON.parse(JSON.stringify(players))[0]; //Human Player
Gamestate.stage = "Fortify"; // Fortify, Battle or AI Turn
Gamestate.turn = 1;
Gamestate.aiTurn = false;
Gamestate.timeInterval = 1000; //Time between AI Turns
Gamestate.gameOver = false;
Gamestate.prevCountry = null; //Store previously selected country
Gamestate.prevTarget = null; //Store previously selected target;

//Game Setup

Gamestate.init = function () {
    modal.style.display = "block";
    winModal.style.display = "none";
    submitName.addEventListener('click', this.start.bind(this));
    restart.addEventListener('click', this.restart.bind(this));
    map.addEventListener('mousedown', this.handleClick.bind(this));
    end.addEventListener('click', this.handleEndTurn.bind(this));
    playAgain.addEventListener('click', this.restart.bind(this));
};

Gamestate.start = function () {
    var _this = this;

    //Reset Variables on Start/Restart
    end.style.pointerEvents = "auto";
    map.style.pointerEvents = "auto";
    modal.style.display = "none";
    playerPanel.style.display = "flex";
    infoPanel.style.display = "block";
    this.aiTurn = false;
    this.timeInterval = 1000;
    this.gameOver = false;
    this.prevCountry = null;
    this.prevTarget = null;
    this.turn = 1;
    this.stage = "Fortify";
    turnInfoMessage.textContent = "Click on your own areas to allocate your resources";
    this.countries = JSON.parse(JSON.stringify(countries));
    this.players = JSON.parse(JSON.stringify(players));
    this.player = this.players[0];
    this.players[0].name = chosenLeader.value;
    this.players[0].country = chosenCountry.value;
    reserveDisplay.innerHTML = 12;
    playerName.textContent = chosenLeader.value;
    playerCountry.textContent = chosenCountry.value;

    if (this.prevTarget) {
        this.prevTarget.classList.remove('flash');
    }

    //Add Players details to Info Panel
    for (var j = 0; j < this.players.length; j++) {
        infoName[j].innerHTML = this.players[j].country;
        infoLeader[j].innerHTML = this.players[j].name;
        infoName[j].parentElement.classList.remove('defeated');
        bar[j].style.background = this.players[j].color;
    }

    //Add Initial Armies to Game
    shuffle(areas).forEach(function (area, i) {
        _this.countries.forEach(function (country) {
            if (country.name === area.id) {
                //Using module as i = 42 areas 
                country.army = _this.placeInitialArmy(i);
                country.owner = _this.players[i % 6].name;
                country.color = _this.players[i % 6].color;
                _this.players[i % 6].areas.push(area.id);
                setTimeout(function () {
                    area.style.fill = country.color;
                    area.nextElementSibling.textContent = country.army;
                }, 25 * i);
            }
        });
    });
    this.player.army += 10;
    this.player.reserve += 10;
    this.updateInfo();
};

//Handle Initial Army Placement at Random
Gamestate.placeInitialArmy = function (i) {
    var reserve = this.players[i % 6].reserve;
    if (i > 35) {
        //dump remaining army on last area
        this.players[i % 6].reserve = this.players[i % 6].bonus;
        this.players[i % 6].army += this.players[i % 6].reserve;
        return reserve;
    }
    if (this.players[i % 6].reserve > 2) {
        var rand = Math.floor(Math.random() * 4);
        this.players[i % 6].reserve -= rand;
        return rand;
    } else {
        return 0;
    }
};

//Win/Lose Handlers

Gamestate.win = function (player) {
    winMessage.textContent = player.name;
    winMessage.style.color = player.color;
    winModal.style.display = "block";
};

Gamestate.restart = function () {
    modal.style.display = "block";
    winModal.style.display = "none";
};

//Update Display and Strength Bar
Gamestate.updateInfo = function () {
    turnInfo.textContent = this.stage;
    var totalArmy = 0;
    this.players.forEach(function (player) {
        totalArmy += player.army;
    });
    this.players.forEach(function (player, i) {
        infoIncome[i].innerHTML = player.bonus;
        bar[i].style.width = player.army / totalArmy * 600 + 'px';
    });
};

/*Gameplay*/

Gamestate.handleEndTurn = function () {
    if (this.aiTurn) {
        return;
    }
    this.aiTurn = true;
    end.style.pointerEvents = "none";
    map.style.pointerEvents = "none";
    this.aiMove();
};

//Bonus Handlers

Gamestate.unitBonus = function (player, i) {
    player.bonus = 0;
    player.bonus += Math.ceil(player.areas.length / 3);
    player.bonus += this.continentBonus(player);
    player.bonus = Math.ceil(player.bonus * (this.turn / 5));
    if (player.bonus < 2) {
        player.bonus = 2;
    }
    infoIncome[i].innerHTML = player.bonus;
    return player.bonus;
};

Gamestate.continentBonus = function (player) {
    var bonus = 0;
    continents.forEach(function (continent) {
        if (player.areas.containsArray(continent.areas)) {
            bonus += continent.bonus;
        }
    });
    return bonus;
};

//Player

Gamestate.handleClick = function (e) {
    if (this.stage === "Fortify") {
        this.addArmy(e);
    } else if (this.stage === "Battle") {
        this.attack(e);
    }
};

//Fortify area on player click
Gamestate.addArmy = function (e) {
    var _this2 = this;

    this.countries.forEach(function (country) {
        //Check if Target is in country array and player has enough in reserve and player owns territory
        if (e.target.id === country.name && _this2.player.reserve > 0 && country.owner === _this2.player.name) {
            if (e.shiftKey) {
                country.army += _this2.player.reserve;
                _this2.player.reserve = 0;
            } else {
                country.army += 1;
                _this2.player.reserve -= 1;
            }
            reserveDisplay.innerHTML = _this2.player.reserve;
            e.target.nextElementSibling.textContent = country.army;
            //Once reserve is empty, battle stage can start
            if (_this2.player.reserve === 0) {
                _this2.stage = "Battle";
                turnInfo.textContent = _this2.stage;
                turnInfoMessage.textContent = "Choose a country to compete on Payments";
            }
        }
    });
};

//Attack handler finds Attacking and defending countries and passes to the battle function
Gamestate.attack = function (e) {
    var _this3 = this;

    //Remove flash animation from previous area 
    if (this.prevTarget) {
        this.prevTarget.classList.remove('flash');
    }
    this.countries.forEach(function (country) {
        if (e.target.id === country.name) {
            e.target.classList.add('flash');
            _this3.prevTarget = e.target;
            if (_this3.prevCountry) {
                if (_this3.prevCountry.name !== country.name && _this3.prevCountry.owner !== country.owner && _this3.prevCountry.owner === _this3.player.name) {
                    _this3.prevCountry.neighbours.forEach(function (neighbour) {
                        if (neighbour === country.name && neighbour.owner !== country.name && _this3.prevCountry.army > 0) {
                            return _this3.battle(_this3.prevCountry, country, _this3.player, 0);
                        }
                    });
                }
            }
            _this3.prevCountry = country;
        }
    });
};

//Computer

//Handles AI Moves
Gamestate.aiMove = function () {
    var _this4 = this;

    if (this.gameOver) {
        return;
    }
    if (this.prevTarget) {
        this.prevTarget.classList.remove('flash');
    }
    this.stage = "AI Turn";
    turnInfoMessage.textContent = "";

    var _loop = function _loop(i) {
        setTimeout(function () {
            //Handle after last player finished turn
            if (i === _this4.players.length) {
                //Handle if human player defeated
                if (_this4.player.areas.length === 0) {
                    _this4.timeInterval = 10;
                    _this4.player.alive = false;
                    return _this4.aiMove();
                }
                _this4.turn += 1;
                _this4.aiTurn = false;
                _this4.stage = "Fortify";
                turnInfoMessage.textContent = "Click on your own areas to allocate all your resources";
                var bonus = _this4.unitBonus(_this4.player, 0);
                _this4.player.reserve += bonus;
                _this4.player.army += bonus;
                end.style.pointerEvents = "auto";
                map.style.pointerEvents = "auto";
                infoName[i - 1].parentElement.classList.remove('highlight');
                infoName[0].parentElement.classList.add('highlight');
                reserveDisplay.innerHTML = _this4.player.reserve;
                return _this4.updateInfo();
            }

            //Handle turn
            infoName[i - 1].parentElement.classList.remove('highlight');
            if (_this4.players[i].alive) {
                infoName[i].parentElement.classList.add('highlight');
                _this4.players[i].reserve = _this4.unitBonus(_this4.players[i], i);
                _this4.players[i].army += _this4.players[i].reserve;

                //Fortify
                var areaToFortify = ["", 0];
                _this4.players[i].areas.forEach(function (area) {
                    _this4.countries.forEach(function (country) {
                        if (country.name === area && _this4.players[i].reserve > 0) {
                            country.neighbours.forEach(function (neighbour) {
                                _this4.countries.forEach(function (c) {
                                    if (c.name === neighbour && c.owner !== _this4.players[i].name) {
                                        var continent = void 0;
                                        continents.forEach(function (x) {
                                            if (x.name === country.continent) {
                                                continent = x;
                                            }
                                        });
                                        var count = 0;
                                        continent.areas.forEach(function (x) {
                                            _this4.players[i].areas.forEach(function (y) {
                                                if (y === x) {
                                                    count++;
                                                }
                                            });
                                        });
                                        var ratio = count / continent.areas.length;
                                        if (ratio >= areaToFortify[1]) {
                                            areaToFortify = [country, ratio];
                                        }
                                    }
                                });
                            });
                        }
                    });
                });

                areaToFortify[0].army += _this4.players[i].reserve;
                _this4.players[i].reserve = 0;
                var areaOnMap = document.getElementById("" + areaToFortify[0].name);
                areaOnMap.nextElementSibling.textContent = areaToFortify[0].army;

                //Attack

                _this4.players[i].areas.forEach(function (area) {
                    _this4.countries.forEach(function (country) {
                        if (country.name === area && country.army > 1) {
                            _this4.aiAttack(country, i);
                        }
                    });
                });
                _this4.updateInfo();
            }
        }, _this4.timeInterval * i);
    };

    for (var i = 1; i <= this.players.length; i++) {
        _loop(i);
    }
};

//Find Attacking and defending countries on AI Attack
Gamestate.aiAttack = function (country, i) {
    var _this5 = this;

    //Add possible targets to array
    var possibleTargets = [];
    country.neighbours.forEach(function (neighbour) {
        _this5.countries.forEach(function (opponent) {
            if (neighbour === opponent.name && opponent.army + 1 < country.army && country.owner !== opponent.owner) {
                possibleTargets.push(opponent);
            }
        });
    });

    //Check which is best target by checking if taking area will control continent
    var target = [possibleTargets[0], 0];
    var continent = void 0;
    possibleTargets.forEach(function (poss) {
        continents.forEach(function (x) {
            if (x.name === poss.continent) {
                continent = x;
            }
        });
        var count = 0;
        continent.areas.forEach(function (x) {
            _this5.players[i].areas.forEach(function (y) {
                if (y === x) {
                    count++;
                }
            });
        });
        var ratio = count / continent.areas.length;
        if (ratio >= target[1]) {
            target = [poss, ratio];
        }
    });
    if (!target[0]) {
        return;
    }
    this.battle(country, target[0], this.players[i], i);
};

//Battle function for Player and AI

Gamestate.battle = function (country, opponent, player, i) {

    var defender = document.getElementById("" + opponent.name);
    var attacker = document.getElementById("" + country.name);
    var opp = void 0;
    this.players.forEach(function (p) {
        if (p.name === opponent.owner) {
            opp = p;
        }
    });

    //Battle Logic
    while (opponent.army >= 0) {
        if (country.army === 0) {
            attacker.nextElementSibling.textContent = 0;
            defender.nextElementSibling.textContent = opponent.army;
            return;
        }
        if (Math.random() > Math.random()) {
            country.army -= 1;
        } else {
            opponent.army -= 1;
        }
    }

    //Handle if Attacker Wins
    if (opponent.army <= 0) {
        //Remove area from defenders areas array
        this.players.forEach(function (player) {
            if (player.name === opponent.owner) {
                var index = player.areas.indexOf(opponent.name);
                if (index > -1) {
                    player.areas.splice(index, 1);
                }
            }
        });

        //Swap defender area to attacker and distribute army evenly between areas
        opponent.owner = player.name;
        opponent.color = player.color;
        player.areas.push(opponent.name);
        defender.style.fill = opponent.color;
        defender.nextElementSibling.textContent = Math.floor(country.army / 2);
        opponent.army = Math.floor(country.army / 2);
        attacker.nextElementSibling.textContent = Math.ceil(country.army / 2);
        country.army = Math.ceil(country.army / 2);

        //If Defender has no areas left they are eliminated
        if (opp.areas.length === 0) {
            opp.alive = false;
            var index = this.players.indexOf(opp);
            infoName[index].parentElement.classList.add('defeated');
        }
    }

    //Calcualting total army for each player
    player.army = 0;
    opp.army = 0;
    this.countries.forEach(function (c) {
        player.areas.forEach(function (area) {
            if (area === c.name) {
                player.army += c.army;
            }
        });
        opp.areas.forEach(function (area) {
            if (area === c.name) {
                opp.army += c.army;
            }
        });
    });

    //Display Bonus modal if player controls continent
    if (this.player.alive) {
        continents.forEach(function (continent) {
            if (player.areas.containsArray(continent.areas)) {
                var matchedCountry = continent.areas.some(function (a) {
                    return a === opponent.name;
                });
                if (matchedCountry) {
                    bonusModal.style.display = "block";
                    bonusModalPlayer.textContent = player.name + " controls";
                    bonusModalText.textContent = continent.name;
                    bonusModalText.style.color = player.color;
                    bonusModalAmount.textContent = continent.bonus;
                    setTimeout(function () {
                        bonusModal.style.display = "none";
                    }, 2000);
                }
            }
        });
    }

    //Win Condition
    if (player.areas.length === 42) {
        this.gameOver = true;
        this.win(player);
    }
};

const countriesData = {
    Spain: {
        potentialCustomers: 100, // Representative data for Spain, Portugal, and France combined
        averageSalary: 2733,     // Average of median salaries
        digitalPayments: 70,     // Average digital payments penetration
        competitionLevel: 5,     // Average competition level (1 to 5 Very High)
        investmentLevel: 7,      // Average investment level required to enter the market (1 to 10 Very High))
        marketTier: 2           // Based in the expected incomes (1: >300MM 2: 100-300MM 3: 25-100MM 4: <25MM)
    },
    Colombia: {
        potentialCustomers: 56,
        averageSalary: 800,
        digitalPayments: 45,
        competitionLevel: 4,
        investmentLevel: 5,
        marketTier: 3
    },
    Indonesia: {
        potentialCustomers: 273, 
        averageSalary: 420,      
        digitalPayments: 50,     
        competitionLevel: 4,
        investmentLevel: 8,
        marketTier: 2
    },
    "New Guinea": {
        potentialCustomers: 9,
        averageSalary: 250,
        digitalPayments: 20,
        competitionLevel: 1,
        investmentLevel: 1,
        marketTier: 4
    },
    "Eastern Australia": {
        potentialCustomers: 15,
        averageSalary: 5000,
        digitalPayments: 80,
        competitionLevel: 4,
        investmentLevel: 8,
        marketTier: 2
    },
    "Western Australia": {
        potentialCustomers: 10,
        averageSalary: 5000,
        digitalPayments: 80,
        competitionLevel: 4,
        investmentLevel: 8,
        marketTier: 3
    },
    Ural: {
        potentialCustomers: 100,
        averageSalary: 400,
        digitalPayments: 50,
        competitionLevel: 4,
        investmentLevel: 5,
        marketTier: 3
    },
    Siberia: {
        potentialCustomers: 14,
        averageSalary: 400,
        digitalPayments: 50,
        competitionLevel: 2,
        investmentLevel: 1,
        marketTier: 4
    },
    Irkutsk: {
        potentialCustomers: 10,
        averageSalary: 400,
        digitalPayments: 50,
        competitionLevel: 2,
        investmentLevel: 1,
        marketTier: 4
    },
    Yakutsk: {
        potentialCustomers: 8,
        averageSalary: 400,
        digitalPayments: 50,
        competitionLevel: 2,
        investmentLevel: 1,
        marketTier: 4
    },
    Kamchatka: {
        potentialCustomers: 2,
        averageSalary: 400,
        digitalPayments: 50,
        competitionLevel: 2,
        investmentLevel: 1,
        marketTier: 4
    },
    Afghanistan: {
        potentialCustomers: 38,
        averageSalary: 100,
        digitalPayments: 10,
        competitionLevel: 1,
        investmentLevel: 2,
        marketTier: 4
    },
    "Middle East": { 
        potentialCustomers: 128,
        averageSalary: 1667,
        digitalPayments: 63,
        competitionLevel: 5,
        investmentLevel: 8,
        marketTier: 2
    },
    India: {
        potentialCustomers: 1100,
        averageSalary: 400,
        digitalPayments: 70,
        competitionLevel: 5,
        investmentLevel: 9,
        marketTier: 1
    },
    Siam: {
        potentialCustomers: 70,
        averageSalary: 700,
        digitalPayments: 60,
        competitionLevel: 4,
        investmentLevel: 7,
        marketTier: 3
    },
    China: {
        potentialCustomers: 1100,
        averageSalary: 600,
        digitalPayments: 90,
        competitionLevel: 5,
        investmentLevel: 10,
        marketTier: 1
    },
    Mongolia: {
        potentialCustomers: 3,
        averageSalary: 400,
        digitalPayments: 40,
        competitionLevel: 2,
        investmentLevel: 2,
        marketTier: 4
    },
    Japan: {
        potentialCustomers: 126,
        averageSalary: 3000,
        digitalPayments: 80,
        competitionLevel: 5,
        investmentLevel: 9,
        marketTier: 1
    },
    Egypt: {
        potentialCustomers: 102,
        averageSalary: 250,
        digitalPayments: 40,
        competitionLevel: 3,
        investmentLevel: 3,
        marketTier: 3
    },
    "North Africa": { 
        potentialCustomers: 268,
        averageSalary: 250,
        digitalPayments: 33,
        competitionLevel: 3,
        investmentLevel: 7,
        marketTier: 3
    },
    "East Africa": { 
        potentialCustomers: 58,
        averageSalary: 75,
        digitalPayments: 12,
        competitionLevel: 1,
        investmentLevel: 1,
        marketTier: 4
    },
    Congo: {
        potentialCustomers: 89,
        averageSalary: 100,
        digitalPayments: 20,
        competitionLevel: 1,
        investmentLevel: 2,
        marketTier: 4
    },
    "South Africa": {
        potentialCustomers: 59,
        averageSalary: 1300,
        digitalPayments: 60,
        competitionLevel: 4,
        investmentLevel: 8,
        marketTier: 3
    },
    Madagascar: {
        potentialCustomers: 27,
        averageSalary: 100,
        digitalPayments: 20,
        competitionLevel: 1,
        investmentLevel: 1,
        marketTier: 4
    },
    Brazil: {
        potentialCustomers: 212,
        averageSalary: 800,
        digitalPayments: 65,
        competitionLevel: 4,
        investmentLevel: 9,
        marketTier: 2
    },
    Peru: {
        potentialCustomers: 33,
        averageSalary: 900,
        digitalPayments: 60,
        competitionLevel: 3,
        investmentLevel: 6,
        marketTier: 3
    },
    Argentina: {
        potentialCustomers: 45,
        averageSalary: 1000,
        digitalPayments: 65,
        competitionLevel: 3,
        investmentLevel: 8,
        marketTier: 3
    },
    Iceland: {
        potentialCustomers: 0.36,
        averageSalary: 5000,
        digitalPayments: 90,
        competitionLevel: 3,
        investmentLevel: 3,
        marketTier: 4
    },
    Scandinavia: {
        potentialCustomers: 21, // Combined population of Norway, Sweden, and Denmark
        averageSalary: 4000,
        digitalPayments: 90,
        competitionLevel: 5,
        investmentLevel: 8,
        marketTier: 3
    },
    "Northern Europe": {
        potentialCustomers: 128, 
        averageSalary: 3750,
        digitalPayments: 80,
        competitionLevel: 5,
        investmentLevel: 9,
        marketTier: 1
    },
    "Southern Europe": {
        potentialCustomers: 140, 
        averageSalary: 1300,
        digitalPayments: 60,
        competitionLevel: 5,
        investmentLevel: 8,
        marketTier: 2
    },
    "United Kingdom": {
        potentialCustomers: 67,
        averageSalary: 3500,
        digitalPayments: 80,
        competitionLevel: 5,
        investmentLevel: 8,
        marketTier: 2
    },
    Ukraine: {
        potentialCustomers: 44,
        averageSalary: 500,
        digitalPayments: 60,
        competitionLevel: 2,
        investmentLevel: 7,
        marketTier: 3
    },
    Greenland: {
        potentialCustomers: 0.056,
        averageSalary: 3000,
        digitalPayments: 60,
        competitionLevel: 1,
        investmentLevel: 3,
        marketTier: 4
    },
    Mexico: {
        potentialCustomers: 128,
        averageSalary: 700,
        digitalPayments: 60,
        competitionLevel: 4,
        investmentLevel: 5,
        marketTier: 2
    },
    "Eastern USA": {
        potentialCustomers: 166,
        averageSalary: 4500,
        digitalPayments: 65,
        competitionLevel: 5,
        investmentLevel: 10,
        marketTier: 1
    },
    "Western USA": {
        potentialCustomers: 165,
        averageSalary: 4500,
        digitalPayments: 65,
        competitionLevel: 5,
        investmentLevel: 10,
        marketTier: 1
    },
    Alaska: {
        potentialCustomers: 0.73, 
        averageSalary: 5000,
        digitalPayments: 80,
        competitionLevel: 5,
        investmentLevel: 4,
        marketTier: 4
    },
    Alberta: {
        potentialCustomers: 4.4,
        averageSalary: 4000,
        digitalPayments: 80,
        competitionLevel: 4,
        investmentLevel: 5,
        marketTier: 3
    },
    Ontario: {
        potentialCustomers: 14.8, 
        averageSalary: 4000,
        digitalPayments: 80,
        competitionLevel: 5,
        investmentLevel: 7,
        marketTier: 4
    },
    Quebec: {
        potentialCustomers: 8.5, 
        averageSalary: 3500,
        digitalPayments: 75,
        competitionLevel: 4,
        investmentLevel: 6,
        marketTier: 3
    },
    "Northwest Territory": {
        potentialCustomers: 0.045, 
        averageSalary: 4200,
        digitalPayments: 70,
        competitionLevel: 2,
        investmentLevel: 1,
        marketTier: 4
    }
};

// Function to calculate net expected annual income for a country
function calculateExpectedIncome(countryData) {
    // Step 1: Calculate Serviceable Available Market (SAM)
    const potentialCustomers = countryData.potentialCustomers * 1_000_000; // Convert millions to individuals
    const digitalPaymentsPenetration = countryData.digitalPayments / 100;   // Convert percentage to decimal
    const SAM = potentialCustomers * digitalPaymentsPenetration;

    // Step 2: Estimate Market Share based on competition level
    const baseMarketShare = 1; // 100% Base Goal
    const competitionAdjustment = (6 - countryData.competitionLevel) / 20;  // Adjust between 5% and 25%
    const marketShare = baseMarketShare * competitionAdjustment; // Real Market Share 5% in big markets, 25% small ones

    const estimatedUsers = SAM * marketShare;

    // Step 3: Determine Average Transaction Value (ATV) per User
    const annualSalary = countryData.averageSalary * 12; // Monthly to annual salary
    const annualSpendPerUser = annualSalary * 0.3;       // 30% of annual salary

    // Step 4: Calculate Total Transaction Value (TTV)
    const totalTransactionValue = estimatedUsers * annualSpendPerUser;

    // Step 5: Estimate Revenue Based on Transaction Fees
    const transactionFeeRate = 0.01; // 1% transaction fee
    const expectedAnnualIncome = totalTransactionValue * transactionFeeRate;

    // Step 6: Calculate Annual Investment Cost with Scaling
    const baseInvestmentCost = 1_000_000; // Base investment cost per investment level point

    let scaleFactor;

    // Determine the scale factor based on the investment level
    if (countryData.investmentLevel >= 1 && countryData.investmentLevel <= 3) {
        scaleFactor = 0.1;
    } else if (countryData.investmentLevel >= 4 && countryData.investmentLevel <= 6) {
        scaleFactor = 1;
    } else if (countryData.investmentLevel >= 7 && countryData.investmentLevel <= 8) {
        scaleFactor = 10;
    } else if (countryData.investmentLevel >= 9 && countryData.investmentLevel <= 10) {
        scaleFactor = 25;
    } else {
        // Handle unexpected investment levels
        scaleFactor = 1;
    }

    const annualInvestmentCost = countryData.investmentLevel * baseInvestmentCost * scaleFactor;

    // Step 7: Calculate Net Expected Annual Income
    const netExpectedAnnualIncome = expectedAnnualIncome - annualInvestmentCost;

    // Return the net expected annual income
    return netExpectedAnnualIncome;
}


const competitionLevels = {
    1: "Blue Ocean",
    2: "Parcial Blue Ocean",
    3: "Competitive",
    4: "Parcial Red Ocean",
    5: "Red Ocean"
};

document.querySelectorAll('.area').forEach((country) => {
    country.addEventListener('mouseenter', (event) => {
        const countryId = event.target.id;
        const countryData = countriesData[countryId];

        if (countryData) {
            // Calculate expected annual income for the country
            const expectedIncome = calculateExpectedIncome(countryData);

            // Muestra la ventana de información
            const popup = document.getElementById('info-popup');
            popup.style.display = 'block';

            // Posiciona la ventana cerca del cursor
            popup.style.left = `${event.pageX + 10}px`;
            popup.style.top = `${event.pageY + 10}px`;

            // Actualiza la información del país con los datos almacenados
            document.getElementById('country-name').innerText = countryId;
            document.getElementById('potential-customers').innerText = `${countryData.potentialCustomers} MM`;
            document.getElementById('average-salary').innerText = `${countryData.averageSalary} USD`;
            document.getElementById('digital-payments').innerText = `${countryData.digitalPayments}%`;
            document.getElementById('competition-level').innerText = competitionLevels[countryData.competitionLevel] || "Unknown";
            document.getElementById('investment-level').innerText = countryData.investmentLevel;
            document.getElementById('country-tier').innerText = countryData.marketTier;

            // Format expectedIncome to a readable number (e.g., in millions)
            const expectedIncomeInMillions = (expectedIncome / 1_000_000).toFixed(2);

            document.getElementById('expected-income').innerText = `${expectedIncomeInMillions} MM $`;
        } else {
            // Hide the information popup if no data is available
            document.getElementById('info-popup').style.display = 'none';
        }
    });

    country.addEventListener('mouseleave', () => {
        // Oculta la ventana de información
        document.getElementById('info-popup').style.display = 'none';
    });
});

// Initialize Game
Gamestate.init();

function openGame(gameId) {
    // Map the gameId to the actual game page URLs
    var gamePages = {
        'trilogy': '../Main.html'
      };
  
    // Get the URL for the selected game
    var gameUrl = gamePages[gameId];
  
    if (gameUrl) {
      // Check if the game page exists (optional)
      // This requires an additional request, which can be complex due to cross-origin policies
      // For simplicity, we'll proceed to navigate
  
      // Navigate to the game page
      window.location.href = gameUrl;
    } else {
      // Display an alert to the user
      alert('Sorry, the selected game is not available.');
    }
  }