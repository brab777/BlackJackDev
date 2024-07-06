let info = {};
const backendUrl = 'https://rngbj.kasoom.com';
const backendUrl2 = 'https://rngbj.kasoom.com';
let Gtoken = '';
let socket = null;

var unityInstance;
var buildUrl = "Build";
var loaderUrl = buildUrl + "/Blackjack Build.loader.js";
var config = {
    dataUrl: buildUrl + "/Blackjack Build.data",
    frameworkUrl: buildUrl + "/Blackjack Build.framework.js",

    codeUrl: buildUrl + "/Blackjack Build.wasm",
    streamingAssetsUrl: "StreamingAssets",
    companyName: "Vivo",
    productName: "Casino Blackjack",
    productVersion: "1.0",
    showBanner: unityShowBanner,
};

console.log("Backend URL: ", backendUrl)

var container = document.querySelector("#unity-container");
var canvas = document.querySelector("#unity-canvas");
var loadingBar = document.querySelector("#unity-loading-bar");
var progressBarFull = document.querySelector("#unity-progress-bar-full");
var warningBanner = document.querySelector("#unity-warning");

//------------------------------------------------------------------------------------------------------------------Unity

// By default Unity keeps WebGL canvas render target size matched with
// the DOM size of the canvas element (scaled by window.devicePixelRatio)
// Set this to false if you want to decouple this synchronization from
// happening inside the engine, and you would instead like to size up
// the canvas DOM size and WebGL render target sizes yourself.
// config.matchWebGLToCanvasSize = false;

if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // Mobile device style: fill the whole browser client area with the game canvas:
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, shrink-to-fit=yes';
    document.getElementsByTagName('head')[0].appendChild(meta);
}

loadingBar.style.display = "block";

var script = document.createElement("script");
script.src = loaderUrl;
script.onload = () => {
    createUnityInstance(canvas, config, (progress) => {
        progressBarFull.style.width = 100 * progress + "%";
    }).then((instance) => {
        unityInstance = instance;
        player.setUnityInstance(unityInstanceRef)
        loadingBar.style.display = "none";
        const currentUrl = window.location.href;
        unityInstance.SendMessage('GameManager', 'HandleInit', JSON.stringify(initResponse));
    }).catch((message) => {
        alert(message);
    });
};
document.body.appendChild(script);

// Shows a temporary message banner/ribbon for a few seconds, or
// a permanent error message on top of the canvas if type=='error'.
// If type=='warning', a yellow highlight color is used.
// Modify or remove this function to customize the visually presented
// way that non-critical warnings and error messages are presented to the
// user.

function unityShowBanner(msg, type) {
    function updateBannerVisibility() {
        warningBanner.style.display = warningBanner.children.length ? 'block' : 'none';
    }
    var div = document.createElement('div');
    div.innerHTML = msg;
    warningBanner.appendChild(div);
    if (type == 'error') div.style = 'background: red; padding: 10px;';
    else {
        if (type == 'warning') div.style = 'background: yellow; padding: 10px;';
        setTimeout(function () {
            warningBanner.removeChild(div);
            updateBannerVisibility();
        }, 5000);
    }
    updateBannerVisibility();
}

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
        callUnityFunctionByName('GameManager', 'OnClientNewState', JSON.stringify(data));
        postMessage(data, "*");
    })

    socket.on('newClientStatus', data => {
        console.log('newClientStatus', data)
        data.newStatus = true;
        data.newPrivatestat = true;
        callUnityFunctionByName('GameManager', 'OnNewClientStatus', JSON.stringify(data));
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
