//how to throw a msg to the screen from this page

let info = {};
const backendUrl = `https://rngbj.kasoom.com/`;
const backendUrl2  = window.location.origin

const socket = io(backendUrl, {
        withCredentials: true
});

console.log('backendUrl', backendUrl)
function tryReconnect(disconnectTIme) {

    console.log("ZZZZ tryReconnect", socket.connected)
    if (!socket.connected) {
        socket.connect();
        setTimeout(() => {
            tryReconnect()
        }, 300)

    } else {
        //location.reload();
        // userAction('getClientRec',playerID,tableID)//@@
        console.log('connecte again guive my rec!!')
        setPlayer(info.tableID, info.playerID) //@@@

    }
}

socket.on('disconnect', (reason) => {
    console.log("zzzz disconnect zzz", reason)
    if (reason == "transport close") { // || reason=="transport error"){        
        tryReconnect(new Date())
    }
})


socket.on('newState', data => {
    data.newStatus = true; //its a socket new state!!
    data.type = 'newState'
    console.log(data)
    postMessage(data, "*")
})


socket.on('newClientStatus', data => {
    console.log('newClientStatus', data)
    data.newStatus = true; //its a socket new state!!
    data.newPrivatestat = true;
    postMessage(data, "*")

})


socket.on('NewBalance', () => {
    console.log('balance!!!   ')
})



socket.on("showMess", data => {
    console.log("zzzz MESSSSssssssssssssssssssssssssssssssssssssssssssSS ", data)
    data.type = "showMess"; //its a socket new state!!
    postMessage(data, '*')
})


function setPlayer(table) { //@@i should sent playerID too.
    console.log('set ', table)
    let mess = {
        type: 'delaerAction',
        command: 'setTable',
        tableId: table,
    }
    postMessage(mess, '*');
    info.tableID = table;
    socket.emit('setPlayer', mess); //now I will be notified for events on this table
}


function setUser(player) {
    info.playerID = player;
}



async function activateGame(token, operator = '') {
    const url = `${backendUrl2}/api/init`;
    console.log("zzz posting toekn:", url, token)

    let res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
            token: token,
            operator: operator,
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    },);

    let finalRes = await res.json()
    if (finalRes.status == "OK") {
        // setPlayer();
    }
    console.log("AFTER INIT", finalRes)
    return finalRes;
}


const fetchRequest = async (command, method, body) => {
    try {
        console.log('fetching', `${backendUrl}/api/${command}`)
        const res = await fetch(`${backendUrl}/api/${command}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
        return await res.json()
    } catch (err) {
        console.log('error fetching', err)
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
        console.log('error', res)
    }
    return res
};


async function init(token) {
    const res = await fetchRequest(`init?token=${token}`, 'GET')
    console.log('init', res)
    return res
}

const HitApi = async (playerId, tableId) => {
    return await call(`hit/${playerId}/${tableId}`, 'GET')
}

const splitApi = (playerId, tableId) => {
    return call(`split/${playerId}/${tableId}`, 'GET')
}

const DoubleApi = (playerId, tableId) => {
    return call(`double/${playerId}/${tableId}`, 'GET')
}

const stateHandApi = (playerId, tableId) => {
    return call(`stateHand/${playerId}/${tableId}`, 'GET')
}

const BetApi = (playerId, tableId, newbetAmount, handId) => {
    return call(`bet/${playerId}/${tableId}/${handId}/${newbetAmount}`, 'GET')
}

const sideBetApi = (playerId, tableId, newbetAmount, handId, betType) => {
    return call(`sideBet/${playerId}/${tableId}/${handId}/${newbetAmount}/${betType}`, 'GET')
}

const StandApi = (playerId, tableId) => {
    return call(`stand/${playerId}/${tableId}`, 'GET')
}

const next = (playerId, tableId) => {
    return call(`next/${playerId}/${tableId}`, 'GET')
}

const confirmBets = (playerId, tableId) => {
    return call(`confirmBets/${playerId}/${tableId}`, 'GET')
}


const isSplitApi = (playerId, tableId) => {
    return call(`isSplit/${playerId}/${tableId}`, 'GET')
}

const TotalApi = (playerId, tableId) => {
    return call(`total/${playerId}/${tableId}`, 'GET')
}



const UndoApi = () => {

}



const DealNowApi = (playerId, tableId, hands) => {
    return call(`confirmBets/${playerId}/${tableId}`, 'POST', hands)
}

const CreateAllApi = () => {

}

const insuranceApi = (playerId, tableId, handNo) => {
    return call(`insurance/${tableId}/${playerId}/${handNo}`, 'GET')

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
