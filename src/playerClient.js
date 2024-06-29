import io from 'socket.io-client';

let info = {};
const backendUrl = `https://rngbj.kasoom.com/`;

const socket = io(backendUrl, {
    withCredentials: true,
    transports: ['websocket']
});

socket.on('disconnect', (reason) => {
    console.log("Disconnected: ", reason);
    if (reason === "io server disconnect") {
        tryReconnect(new Date());
    } else if (reason === "transport close" || reason === "ping timeout") {
        tryReconnect(new Date());
    } else {
        console.log("Unknown disconnection reason:", reason);
    }
});

socket.on('newState', data => {
    console.log("NewState Called...");
    data.newStatus = true;
    data.type = 'newState';
    console.log(data);
    window.postMessage(data, "*");
});

socket.on('newClientStatus', data => {
    console.log('newClientStatus', data);
    data.newStatus = true;
    data.newPrivatestat = true;
    window.postMessage(data, "*");
});

socket.on('NewBalance', () => {
    console.log('New balance function called!');
});

socket.on("showMess", data => {
    console.log("Posting message: ", data);
    data.type = "showMess";
    window.postMessage(data, '*');
});

socket.on('message', (message) => {
    console.log('Received message:', message);
    if (typeof message === 'string') {
        const data = JSON.parse(message);
        if (data.action === 'init_response') {
            setUser(data.info.userId);
            setPlayer(data.info.sessionId);
        }
    }
});

socket.on('connect_error', (error) => {
    console.log("Connection error:", error.message);
});

socket.on('error', (error) => {
    console.error('WebSocket Error:', error);
});

socket.on('reconnect_error', (error) => {
    console.log("Reconnection error:", error.message);
});

function tryReconnect(disconnectTime) {
    console.log("Trying to reconnect... ", socket.connected);
    if (!socket.connected) {
        socket.connect();
        setTimeout(() => {
            tryReconnect();
        }, 4000);
    } else {
        console.log("Connection reestablished!");
        setPlayer(info.tableID, info.playerID);
    }
}

function setPlayer(table) {
    console.log('Setting player with table: ', table);
    let mess = {
        type: 'delaerAction',
        command: 'setTable',
        tableId: table,
    };
    window.postMessage(mess, '*');
    info.tableID = table;
    socket.emit('setPlayer', mess, (response) => {
        console.log('Response: ', response);
        if (response && response.error) {
            console.log('Emit error: ', response.error);
        } else {
            console.log('Emit successful: ', response);
        }
    });
}

function setUser(player) {
    info.playerID = player;
}

async function activateGame(token, operator = '') {
    const url = `${backendUrl}api/init`;
    console.log("Posting token: ", url, token);

    let res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
            token: token,
            operator: operator,
        }),
        credentials: 'include',
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
            'access-control-allow-credentials': true,
            'withCredentials': true
        }
    });

    let finalRes = await res.json();
    console.log("Activation response: ", finalRes);
    return finalRes;
}

const fetchRequest = async (command, method, body) => {
    try {
        const res = await fetch(`${backendUrl}api/${command}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'access-control-allow-credentials': true,
                'withCredentials': true
            },
            credentials: 'include',
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch (err) {
        console.log('Error fetching: ', err);
        return {
            status: 'azErr',
            errCode: 'fetchErr'
        };
    }
};

const call = async (command, method, body) => {
    const res = await fetchRequest(command, method, body);
    if (res.status === 'azErr') {
        const errCode = res.errCode;
        if (errCode == 'noSession') {
            const initRes = await init();
            if (initRes.status === 'OK') {
                return await call(command, method, body);
            }
        }
        console.log('Fetch error: ', res);
    }
    return res;
};

async function init(token) {
    const res = await fetchRequest(`init?token=${token}`, 'GET');
    console.log('Init response: ', res);
    return res;
}

const HitApi = async (playerId, tableId) => call(`hit/${playerId}/${tableId}`, 'GET');
const splitApi = (playerId, tableId) => call(`split/${playerId}/${tableId}`, 'GET');
const DoubleApi = (playerId, tableId) => call(`double/${playerId}/${tableId}`, 'GET');
const stateHandApi = (playerId, tableId) => call(`stateHand/${playerId}/${tableId}`, 'GET');
const BetApi = (playerId, tableId, newbetAmount, handId) => call(`bet/${playerId}/${tableId}/${handId}/${newbetAmount}`, 'GET');
const sideBetApi = (playerId, tableId, newbetAmount, handId, betType) => call(`sideBet/${playerId}/${tableId}/${handId}/${newbetAmount}/${betType}`, 'GET');
const StandApi = (playerId, tableId) => call(`stand/${playerId}/${tableId}`, 'GET');
const next = (playerId, tableId) => call(`next/${playerId}/${tableId}`, 'GET');
const confirmBets = (playerId, tableId) => call(`confirmBets/${playerId}/${tableId}`, 'GET');
const isSplitApi = (playerId, tableId) => call(`isSplit/${playerId}/${tableId}`, 'GET');
const TotalApi = (playerId, tableId) => call(`total/${playerId}/${tableId}`, 'GET');
const insuranceApi = (playerId, tableId, handNo) => call(`insurance/${tableId}/${playerId}/${handNo}`, 'GET');

export {
    setUser,
    HitApi,
    splitApi,
    stateHandApi,
    BetApi,
    StandApi,
    DoubleApi,
    isSplitApi,
    init,
    TotalApi,
    insuranceApi,
    next,
    confirmBets,
    setPlayer,
    sideBetApi,
    activateGame
};