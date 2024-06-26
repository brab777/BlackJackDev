import React, { useEffect } from 'react';
import * as player from './playerClient';
import io from 'socket.io-client';
import './App.css';

const UnityComponent = () => {
  useEffect(() => {
    const container = document.querySelector("#unity-container");
    const canvas = document.querySelector("#unity-canvas");
    const loadingBar = document.querySelector("#unity-loading-bar");
    const progressBarFull = document.querySelector("#unity-progress-bar-full");
    const warningBanner = document.querySelector("#unity-warning");

    const backendUrl = `https://rngbj.kasoom.com/`;
    const urlParams = new URLSearchParams(window.location.search);
    const bankID = urlParams.get('bankId');
    const token = urlParams.get('token');
    const operatorID = urlParams.get('operatorID');
    const tableguid = "C8C12026C4F04EE4B5900BA017119B52";
    const gameid = urlParams.get('gameid');

    player.activateGame(token).then(initResponse => {
      console.log('wls url: ', window.location.search);

      if (!initResponse?.info?.userId){ 
          alert('No user ID.')
      }

      let strategy;
      let dealerKey = 'iqNy5YfOCk';
      let tableID = initResponse.info.sessionId;
      let playerID= initResponse.info.userId;

      player.setPlayer(tableID, playerID);

      window.addEventListener('offline', () => {
        console.log('The network connection has been lost.');
      });

      window.addEventListener('online', () => {
        console.log('The network connection has been restored.');
      });

      const renderState = (state) => {
        if(!state.newPrivatestat){
            document.getElementById("json").innerHTML = JSON.stringify(state, undefined, 2);
        } else {
            document.getElementById("prjson").innerHTML = JSON.stringify(state, undefined, 2);
        }
      };

      const unityShowBanner = (msg, type) => {
        const updateBannerVisibility = () => {
          warningBanner.style.display = warningBanner.children.length ? 'block' : 'none';
        };

        const div = document.createElement('div');
        div.innerHTML = msg;
        warningBanner.appendChild(div);

        if (type === 'error') {
          div.style = 'background: red; padding: 10px;';
        } else {
          if (type === 'warning') div.style = 'background: yellow; padding: 10px;';
          setTimeout(() => {
            warningBanner.removeChild(div);
            updateBannerVisibility();
          }, 5000);
        }

        updateBannerVisibility();
      };

      const buildUrl = "Build";
      const loaderUrl = `${buildUrl}/Blackjack Build.loader.js`;
      const config = {
        dataUrl: `${buildUrl}/Blackjack Build.data`,
        frameworkUrl: `${buildUrl}/Blackjack Build.framework.js`,
        codeUrl: `${buildUrl}/Blackjack Build.wasm`,
        streamingAssetsUrl: "StreamingAssets",
        companyName: "Vivo",
        productName: "Casino Blackjack",
        productVersion: "1.0",
        showBanner: unityShowBanner,
      };

      loadingBar.style.display = "block";

      const script = document.createElement("script");
      /*script.src = loaderUrl;
      script.onload = () => {
        createUnityInstance(canvas, config, (progress) => {
          progressBarFull.style.width = 100 * progress + "%";
        }).then(unityInstance => {
          loadingBar.style.display = "none";          
        }).catch(message => {
          alert(message);
        });
      };*/
      document.body.appendChild(script);
    });

    // XMLHttpRequest patch
    XMLHttpRequest.prototype.originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(_, url) {
      const original = this.originalOpen.apply(this, arguments);
      if (url.indexOf('https://rngbj.kasoom.com/') === 0) {
        this.withCredentials = true;
      }
      return original;
    };
  }, []);

  return (
    <div id="unity-container">
      <canvas id="unity-canvas" width={960} height={600} tabIndex="-1"></canvas>
      <div id="unity-loading-bar">
        <div id="unity-logo"></div>
        <div id="unity-progress-bar-empty">
          <div id="unity-progress-bar-full"></div>
        </div>
      </div>
      <div id="unity-warning"></div>
    </div>
  );
};

export default UnityComponent;