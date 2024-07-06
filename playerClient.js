let info = {};
const backendUrl = 'https://rngbj.kasoom.com';
const backendUrl2 = 'https://rngbj.kasoom.com';
let Gtoken = '';
let socket = null;
var unityInstance;

console.log("Backend URL: ", backendUrl)

//------------------------------------------------------------------------------------------------------------------Socket.on

function CreateSocket()
{
    socket = io(backendUrl, {
        withCredentials: true,
        upgrade: false,
        transports: ['websocket'],
        auth: {
            token: Gtoken
        }
    });

    socket.on('disconnect', (reason) => {
        console.log("Disconnected: ", reason);
        if (reason === "io server disconnect") {
            // Server disconnected the socket
            console.log("Server initiated disconnection.");
            tryReconnect(new Date());
        } else if (reason === "transport close" || reason === "ping timeout") {
            // Network issues or client-side disconnects
            console.log("Client-side disconnection or network issue.");
            tryReconnect(new Date());
        } else {
            console.log("Unknown disconnection reason:", reason);
        }
    })

    socket.on('newState', data => {
        console.log("NewState Called...");
        data.newStatus = true;
        data.type = 'newState';
        console.log(data);
        postMessage(data, "*");
    })

    socket.on('newClientStatus', data => {
        console.log('newClientStatus', data)
        data.newStatus = true;
        data.newPrivatestat = true;
        callUnityFunctionByName('GameManager', 'HandleInit', JSON.stringify(data));
        postMessage(data, "*");
    })

    socket.on('NewBalance', () => {
        console.log('New balance function called!')
    })

    socket.on("showMess", data => {
        console.log("Posting message: ", data)
        data.type = "showMess";
        postMessage(data, '*')
    })

    /*
    socket.on('message', (message) => {
        console.log('Message received :', message);
        // Handle incoming messages from the WebSocket server
        if (typeof message === 'string') {
            const data = JSON.parse(message);
            if (data.action === 'init_response') {
                setUser(data.info.userId);
                setPlayer(data.info.sessionId);
            }
        }
    });
    */

    socket.on('connect_error', (error) => {
        console.log("Connection error:", error.message);
    });

    socket.on('error', (error) => {
        console.error('WebSocket Error:', error);
    });

    socket.on('reconnect_error', (error) => {
        console.log("Reconnection error:", error.message);
    });
}

//------------------------------------------------------------------------------------------------------------------Socket Functions

function tryReconnect(disconnectTIme) {

    console.log("Trying to reconnect... ", socket.connected)
    if (!socket.connected) {
        socket.connect();
        setTimeout(() => {
            tryReconnect()
        }, 300)

    } else {
        console.log("Connection reestablished!")
        setPlayer(info.tableID, info.playerID)
    }
}

//------------------------------------------------------------------------------------------------------------------Player Functions

function setPlayer(table, token) { //Should sent playerID too?
    console.log('Setting player with table: ', table)
    let mess = {
        type: 'delaerAction',
        command: 'setTable',
        tableId: table,
        token: token
    }
    postMessage(mess, '*');
    info.tableID = table;
    console.log('Table message: ', table, mess)
    socket.emit('setPlayer', mess);
}

function setUser(player) {
    info.playerID = player;
}

async function activateGame(token, operator = '') {
    const url = `${backendUrl}/api/init`;
    console.log("Posting token to init: ", url, token)
    let res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
            token: token,
            operator: operator
        }),
	    credentials: 'include',
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
	        'access-control-allow-credentials' : true,
	        //'withCredentials' : true
        }
    },);

    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }

    let finalRes = await res.json()
    Gtoken = finalRes.token;
    console.log("Token received: ", Gtoken)
    console.log("After init: ", info.tableID, info.playerID, Gtoken)
    CreateSocket()
    setPlayer('528', Gtoken)
    if (finalRes.status == "OK") {
        //setPlayer();
    }
    console.log("Activation response token: ", finalRes.token)
    return finalRes;
}


const fetchRequest = async (command, method, body) => {
    console.log('Fetching: ', `${backendUrl}/api/${command}`, 'token', Gtoken)
    try {
        const res = await fetch(`${backendUrl}/api/${command}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': `Bearer ${Gtoken}`,
		        'access-control-allow-credentials' : true
            },
            credentials: 'include',
            body: JSON.stringify(body)
        })
        if (!res.ok) {
            console.log('Response not OK: ', res.status, res.statusText);
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return await res.json()
    } catch (err) {
        console.log('Error fetching: ', err)
        return {
            status: 'azErr',
            errCode: 'fetchErr'
        }
    }
}

const call = async (command, method, body) => {
    const res = await fetchRequest(command, method, body)
    if (res.status === 'azErr') {
        const errCode = res.errCode;
        if (errCode == 'noSession') {
            const initRes = await init()
            if (initRes.status === 'OK') {
                //call itself again
                return await call(command, method, body)
            }
        }
        console.log('Fetch error: ', res)
    }
    return res
};

function setUnityInstance(unityInstanceRef) {
    unityInstance = unityInstanceRef;
}

function callUnityFunctionByName(GOName, FName, dataU) {
    if (unityInstance) {
        unityInstance.SendMessage(GOName, FName, JSON.stringify(dataU));
    } else {
        console.error("Unity instance is not initialized.");
    }
}

async function init(token) {
    const res = await fetchRequest(`init?token=${token}`, 'GET')
    console.log('Init response: ', res)
    return res
}

const HitApi = async () => {
    return await call(`hit/${info.playerID}/${info.tableID}`, 'GET')
}

const splitApi = () => {
    return call(`split/${info.playerID}/${info.tableID}`, 'GET')
}

const DoubleApi = () => {
    return call(`double/${info.playerID}/${info.tableID}`, 'GET')
}

const stateHandApi = () => {
    return call(`stateHand/${info.playerID}/${info.tableID}`, 'GET')
}

const BetApi = (newbetAmount, handId) => {
    console.log('Fetching BETAPI: ', `${backendUrl}/api/${command}`, 'token', Gtoken)
    return call(`bet/${info.playerID}/${info.tableID}/${handId}/${newbetAmount}`, 'GET')
}

const sideBetApi = (newbetAmount, handId, betType) => {
    return call(`sideBet/${info.playerID}/${info.tableID}/${handId}/${newbetAmount}/${betType}`, 'GET')
}

const StandApi = () => {
    return call(`stand/${info.playerID}/${info.tableID}`, 'GET')
}

const next = () => {
    return call(`next/${info.playerID}/${info.tableID}`, 'GET')
}

const confirmBets = () => {
    console.log("Llego3")
    return call(`confirmBets/${info.playerID}/${info.tableID}`, 'GET')
}


const isSplitApi = () => {
    return call(`isSplit/${info.playerID}/${info.tableID}`, 'GET')
}

const TotalApi = () => {
    return call(`total/${info.playerID}/${info.tableID}`, 'GET')
}

const UndoApi = () => {

}

const DealNowApi = (hands) => {
    return call(`confirmBets/${info.playerID}/${info.tableID}`, 'POST', hands)
}

const CreateAllApi = () => {

}

const insuranceApi = (handNo) => {
    return call(`insurance/${info.playerID}/${info.tableID}/${handNo}`, 'GET')

}

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
    UndoApi,
    next,
    confirmBets,
    CreateAllApi,
    setPlayer,
    sideBetApi,
    activateGame
};
