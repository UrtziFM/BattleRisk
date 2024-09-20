// MCTS.js

class Node {
    constructor(state, parent = null, move = null) {
        this.state = state;
        this.parent = parent;
        this.move = move; // The move that led to this state from the parent
        this.children = [];
        this.visits = 0;
        this.totalScore = 0; // Sum of scores from simulations
    }

    addChild(child) {
        this.children.push(child);
    }

    incrementVisits() {
        this.visits++;
    }

    addScore(score) {
        this.totalScore += score;
    }
}

class MCTS {
    constructor(iterations = 10000, stage) {
        this.iterations = iterations;
        this.stage = stage; // 'Fortify' or 'Battle'
        this.minScore = null;
        this.maxScore = null;
    }

    selectPromisingNode(node) {
        while (node.children.length !== 0) {
            node = this.bestUCT(node);
        }
        return node;
    }

    bestUCT(node) {
        let bestNode = null;
        let maxUCT = -Infinity;
        const explorationParameter = 2; // Default is sqrt(2)

        node.children.forEach(child => {
            let uctValue;
            if (child.visits === 0) {
                uctValue = Infinity; // Ensure unvisited nodes are explored
            } else {
                uctValue = (child.totalScore / child.visits) + explorationParameter * Math.sqrt(Math.log(node.visits) / child.visits);
            }
            if (uctValue > maxUCT) {
                bestNode = child;
                maxUCT = uctValue;
            }
        });
        return bestNode;
    }

    expandNode(node) {
        const possibleMoves = this.getPossibleMoves(node.state);
        possibleMoves.forEach(possibleMove => {
            const newNode = new Node(possibleMove.state, node, possibleMove.move);
            node.addChild(newNode);
        });
    }

    simulateRandomPlayout(node) {
        let tempState = JSON.parse(JSON.stringify(node.state));
    
        let playoutStage = this.stage;
        let currentPlayerIndex = tempState.players.findIndex(p => p.name === tempState.currentPlayer.name);
    
        const maxDepth = 10;
        let depth = 0;
    
        while (!this.isTerminal(tempState) && depth < maxDepth) {
            depth++;
    
            const currentPlayer = tempState.players[currentPlayerIndex];
            tempState.currentPlayer = currentPlayer;
    
            if (playoutStage === 'Fortify') {
                // Bias fortification towards high marketTier countries
                const ownedCountries = tempState.countries.filter(c => c.owner === currentPlayer.name);
                const highTierCountries = ownedCountries.filter(c => {
                    const countryData = countriesData[c.name];
                    return countryData && countryData.marketTier <= 2; // Tiers 1 and 2
                });
    
                const targetCountry = highTierCountries.length > 0 ? highTierCountries[0] : ownedCountries[0];
    
                if (currentPlayer.reserve > 0 && targetCountry) {
                    targetCountry.army += currentPlayer.reserve;
                    currentPlayer.reserve = 0;
                }
                playoutStage = 'Battle';
            } else if (playoutStage === 'Battle') {
                // Bias attacks towards high marketTier countries
                let attackMade = false;
                const ownedCountries = tempState.countries.filter(c => c.owner === currentPlayer.name && c.army > 1);
    
                for (let country of ownedCountries) {
                    const enemyNeighbors = country.neighbours
                        .map(name => tempState.countries.find(c => c.name === name))
                        .filter(c => c && c.owner !== currentPlayer.name);
    
                    // Prioritize high marketTier enemies
                    enemyNeighbors.sort((a, b) => {
                        const aTier = countriesData[a.name]?.marketTier || 4;
                        const bTier = countriesData[b.name]?.marketTier || 4;
                        return aTier - bTier;
                    });
    
                    if (enemyNeighbors.length > 0) {
                        const targetCountry = enemyNeighbors[0];
                        const { newState } = this.simulateAttack(tempState, country, targetCountry);
                        tempState = newState;
                        attackMade = true;
                        break;
                    }
                }
    
                if (!attackMade) {
                    // No attack possible; move to next player
                    currentPlayerIndex = (currentPlayerIndex + 1) % tempState.players.length;
                    playoutStage = 'Fortify';
                }
            } else {
                // Next player's turn
                currentPlayerIndex = (currentPlayerIndex + 1) % tempState.players.length;
                playoutStage = 'Fortify';
            }
        }
    
        const score = this.calculateScore(tempState);
        return score;
    }    

    backPropagation(node, score) {
        while (node !== null) {
            node.incrementVisits();
            node.addScore(score); // Accumulate the score
            node = node.parent;
        }
    }

    runMCTS(rootState) {
        const rootNode = new Node(rootState);

        for (let i = 0; i < this.iterations; i++) {
            const promisingNode = this.selectPromisingNode(rootNode);
            if (!this.isTerminal(promisingNode.state)) {
                this.expandNode(promisingNode);
            }
            let nodeToExplore = promisingNode;
            if (promisingNode.children.length > 0) {
                nodeToExplore = promisingNode.children[Math.floor(Math.random() * promisingNode.children.length)];
            }
            const score = this.simulateRandomPlayout(nodeToExplore);
            this.backPropagation(nodeToExplore, score);
        }

        const topMoves = this.getTopMoves(rootNode, 5);
        return topMoves;
    }

    getTopMoves(rootNode, N) {
        if (rootNode.children.length === 0) {
            console.warn("No possible moves found.");
            return [];
        }

        // Collect children and their stats
        const childrenStats = rootNode.children.map(child => {
            const averageScore = child.totalScore / child.visits;
            return {
                move: child.move,
                visits: child.visits,
                totalScore: child.totalScore,
                averageScore: averageScore,
                child: child
            };
        });

        // Sort by average score
        childrenStats.sort((a, b) => b.averageScore - a.averageScore);

        // Get top N moves
        const topMoves = childrenStats.slice(0, N).map(stat => {
            return {
                move: stat.move,
                score: stat.averageScore,
                visits: stat.visits,
                totalScore: stat.totalScore
            };
        });

        // Determine the score range for display
        this.minScore = Math.min(...childrenStats.map(stat => stat.averageScore));
        this.maxScore = Math.max(...childrenStats.map(stat => stat.averageScore));

        return topMoves;
    }

    getPossibleMoves(state, stageOverride = null) {
        const stage = stageOverride || this.stage;
        if (stage === 'Fortify') {
            return this.getFortifyMoves(state);
        } else if (stage === 'Battle') {
            return this.getBattleMoves(state);
        }
        return [];
    }

    isTerminal(state) {
        // For simulation purposes, we consider the game terminal if a player has won or after a certain depth
        const remainingPlayers = state.players.filter(player => player.areas.length > 0);
        if (remainingPlayers.length <= 1) {
            return true;
        }
        return false;
    }

    getFortifyMoves(state) {
        const possibleMoves = [];
        if (!state || !state.countries || !state.currentPlayer || state.currentPlayer.reserve <= 0) {
            return possibleMoves;
        }
    
        const ownedCountries = state.countries.filter(country => country.owner === state.currentPlayer.name);
    
        // Rank countries by marketTier
        const rankedCountries = ownedCountries.map(country => {
            const countryData = countriesData[country.name];
            const marketTier = countryData ? countryData.marketTier : 4; // Default to lowest tier if not found
            return {
                country: country,
                marketTier: marketTier
            };
        });
    
        // Sort countries: lower marketTier (better markets) first
        rankedCountries.sort((a, b) => a.marketTier - b.marketTier);
    
        // Generate initial allocation focusing on high marketTier countries
        const initialAllocation = rankedCountries.map(item => ({
            country: item.country.name,
            troops: 0
        }));
    
        let remainingReserve = state.currentPlayer.reserve;
    
        // Allocate troops starting with highest priority countries
        for (let alloc of initialAllocation) {
            if (remainingReserve <= 0) break;
            alloc.troops += 1;
            remainingReserve -= 1;
        }
    
        // Generate multiple allocation variations
        const allocationVariations = this.generateAllocationVariations(initialAllocation, 1000); // Adjust number as needed
    
        allocationVariations.forEach(allocation => {
            // Create a new state with the allocation
            const newState = JSON.parse(JSON.stringify(state));
            allocation.forEach(alloc => {
                const country = newState.countries.find(c => c.name === alloc.country);
                if (country) {
                    country.army += alloc.troops;
                }
            });
            newState.currentPlayer.reserve = 0; // All troops allocated
    
            const move = {
                type: 'fortify',
                allocations: allocation
            };
    
            possibleMoves.push({ state: newState, move: move });
        });
    
        return possibleMoves;
    }      

    // Helper function to generate allocation variations
    generateAllocationVariations(initialAllocation, numVariations) {
        const allocations = [];
    
        for (let i = 0; i < numVariations; i++) {
            const newAllocation = JSON.parse(JSON.stringify(initialAllocation));
    
            // Randomly redistribute troops among countries
            let remainingTroops = newAllocation.reduce((sum, alloc) => sum + alloc.troops, 0);
    
            // Reset troops to zero
            newAllocation.forEach(alloc => alloc.troops = 0);
    
            // Randomly assign troops
            while (remainingTroops > 0) {
                const idx = Math.floor(Math.random() * newAllocation.length);
                newAllocation[idx].troops += 1;
                remainingTroops -= 1;
            }
    
            allocations.push(newAllocation);
        }
    
        return allocations;
    }    

    getBattleMoves(state) {
        const possibleMoves = [];
    
        if (!state || !state.countries || !state.currentPlayer) return possibleMoves;
    
        state.countries.forEach(country => {
            if (country.owner === state.currentPlayer.name && country.army > 1) {
                country.neighbours.forEach(neighbourName => {
                    const neighbour = state.countries.find(c => c.name === neighbourName);
                    if (neighbour && neighbour.owner !== state.currentPlayer.name) {
                        const countryData = countriesData[neighbour.name];
                        const marketTier = countryData ? countryData.marketTier : 4;
                        const desirability = 5 - marketTier; // Higher desirability for better markets
    
                        const { newState, move } = this.simulateAttack(state, country, neighbour);
                        move.desirability = desirability;
                        possibleMoves.push({ state: newState, move: move });
                    }
                });
            }
        });
    
        // Sort moves by desirability
        possibleMoves.sort((a, b) => b.move.desirability - a.move.desirability);
    
        return possibleMoves.slice(0, 10); // Limit to top 10 moves
    }    

    simulateAttack(state, fromCountry, toCountry) {
        const newState = JSON.parse(JSON.stringify(state)); // Clone the state

        const newFromCountry = newState.countries.find(c => c.name === fromCountry.name);
        const newToCountry = newState.countries.find(c => c.name === toCountry.name);

        // Simple dice roll simulation based on Risk rules
        const attackerDice = Math.min(newFromCountry.army - 1, 3);
        const defenderDice = Math.min(newToCountry.army, 2);

        const attackerRolls = Array.from({ length: attackerDice }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
        const defenderRolls = Array.from({ length: defenderDice }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

        for (let i = 0; i < Math.min(attackerDice, defenderDice); i++) {
            if (attackerRolls[i] > defenderRolls[i]) {
                newToCountry.army -= 1;
            } else {
                newFromCountry.army -= 1;
            }
        }

        // Handle capture of the country
        if (newToCountry.army <= 0) {
            newToCountry.owner = state.currentPlayer.name;
            const armiesToMove = attackerDice;
            newToCountry.army = armiesToMove;
            newFromCountry.army -= armiesToMove;

            const player = newState.players.find(p => p.name === state.currentPlayer.name);
            if (player) {
                player.areas.push(newToCountry.name);
            }

            const defendingPlayer = newState.players.find(p => p.name === toCountry.owner);
            if (defendingPlayer) {
                const index = defendingPlayer.areas.indexOf(newToCountry.name);
                if (index !== -1) {
                    defendingPlayer.areas.splice(index, 1);
                }
            }
        }

        const move = {
            type: 'attack',
            from: fromCountry.name,
            to: toCountry.name
        };

        return { newState, move };
    }

    calculateScore(state) {
        if (!state || !state.players) return 0;
        const currentPlayer = state.players.find(p => p.name === state.currentPlayer.name);
        if (!currentPlayer) return 0;
    
        let score = 0;
    
        // Higher score for more territories and army strength
        const totalArmy = currentPlayer.areas.reduce((sum, areaName) => {
            const country = state.countries.find(c => c.name === areaName);
            return sum + (country ? country.army : 0);
        }, 0);
    
        score += currentPlayer.areas.length * 10; // Each territory is worth 10 points
        score += totalArmy * 2; // Each army unit is worth 2 points
    
        // **Incorporate marketTier into the score**
        const marketTierScore = currentPlayer.areas.reduce((sum, areaName) => {
            const countryData = countriesData[areaName];
            if (countryData && countryData.marketTier) {
                // Higher tier (lower number) means better market; invert the tier for scoring
                const invertedTier = 5 - countryData.marketTier; // 1 becomes 4, 4 becomes 1
                return sum + invertedTier * 20; // Assign weight to marketTier
            }
            return sum;
        }, 0);
    
        score += marketTierScore;
    
        // Bonus for controlling continents
        const controlledContinents = this.getControlledContinents(currentPlayer, state);
        score += controlledContinents.length * 50;
    
        // Penalty for enemy neighbors
        const enemyBorders = currentPlayer.areas.reduce((sum, areaName) => {
            const country = state.countries.find(c => c.name === areaName);
            if (!country) return sum;
            const enemyNeighbors = country.neighbours.filter(neighbourName => {
                const neighbour = state.countries.find(c => c.name === neighbourName);
                return neighbour && neighbour.owner !== currentPlayer.name;
            });
            return sum + enemyNeighbors.length;
        }, 0);
    
        score -= enemyBorders * 5; // Each enemy border reduces the score
    
        // Ensure score is a valid number
        if (isNaN(score)) {
            score = 0;
        }
    
        return score;
    }    

    getControlledContinents(player, state) {
        const controlledContinents = [];
        if (!state.continents) return controlledContinents;
        state.continents.forEach(continent => {
            const isControlled = continent.areas.every(area => player.areas.includes(area));
            if (isControlled) {
                controlledContinents.push(continent);
            }
        });
        return controlledContinents;
    }
}

// Function to generate the top moves
function generateTopMoves(currentState, stage) {
    const mcts = new MCTS(1000, stage); // Number of iterations
    const moves = mcts.runMCTS(currentState);
    // Store the score range in the moves array
    moves.minScore = mcts.minScore;
    moves.maxScore = mcts.maxScore;
    return moves; // Return the top moves with their scores
}

// Integrate with your game logic
function getTopMovesForPlayer(player) {
    const currentState = {
        countries: Gamestate.countries,
        players: Gamestate.players,
        currentPlayer: player,
        continents: Gamestate.continents // Ensure continents are included if used
    };

    const stage = Gamestate.stage; // 'Fortify', 'Battle', or 'AI Turn'

    const recommendButton = document.getElementById('recommend-btn');
    const topMovesDiv = document.getElementById("top-moves");

    if (stage === 'AI Turn') {
        // Disable recommendations button
        recommendButton.disabled = true;
        topMovesDiv.innerHTML = '<p>No recommendations during AI Turn.</p>';
        return;
    } else {
        // Enable recommendations button
        recommendButton.disabled = false;
    }

    const moves = generateTopMoves(currentState, stage);

    // Render the recommended moves in the HTML
    topMovesDiv.innerHTML = ''; // Clear previous recommendations

    if (moves.length === 0) {
        topMovesDiv.innerHTML = '<p>No recommendations available.</p>';
        return;
    }

    // Get the score range from the MCTS instance
    const minScore = moves.minScore;
    const maxScore = moves.maxScore;

    // Format the moves to display as readable text with scores
    moves.forEach((moveObj, index) => {
        const move = moveObj.move;
        const score = moveObj.score.toFixed(2);
        const moveElement = document.createElement('p');
        if (stage === 'Fortify') {
            const allocationsText = move.allocations
                .filter(alloc => alloc.troops > 0) // Only display allocations with troops
                .map(alloc => `<strong>${alloc.troops}</strong> troop(s) to <strong>${alloc.country}</strong>`)
                .join(', ');
            moveElement.innerHTML = `${index + 1}. Allocate: ${allocationsText} (Score: ${score} in range ${minScore.toFixed(2)} - ${maxScore.toFixed(2)})`;
        } else if (stage === 'Battle') {
            moveElement.innerHTML = `${index + 1}. Attack from <strong>${move.from}</strong> to <strong>${move.to}</strong> (Score: ${score} in range ${minScore.toFixed(2)} - ${maxScore.toFixed(2)})`;
        }
        topMovesDiv.appendChild(moveElement);
    });
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    const recommendButton = document.getElementById('recommend-btn');

    recommendButton.addEventListener('click', () => {
        getTopMovesForPlayer(Gamestate.player); // Call the function to get recommendations when clicked
    });
});
