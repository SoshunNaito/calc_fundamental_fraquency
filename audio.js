// クロスブラウザ定義
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// 変数定義
let localMediaStream = null;
let localScriptProcessor = null;
let audioContext = null;
let bufferSize = 1024;
let recordingFlg = false;

// キャンバス
let canvas1 = document.getElementById('canvas1');
let canvas2 = document.getElementById('canvas2');
let canvasContext1 = canvas1.getContext('2d');
let canvasContext2 = canvas2.getContext('2d');

// 音声解析
let audioAnalyser = null;
let timeDomainData = null;
let frequencyData = null;

let fsDivN = 0;// 1サンプルあたりの周波数
let F0 = 0;

// 録音バッファ作成（録音中自動で繰り返し呼び出される）
let onAudioProcess = function (e) {
	if (!recordingFlg) return;

	// 録音データを更新する
	audioAnalyser.getByteTimeDomainData(timeDomainData);
	audioAnalyser.getByteFrequencyData(frequencyData);

	// 波形を解析
	calcF0();
	draw();
};

let calcF0 = function(){
	let s0=0, f0=0;
	for(let f=20;f<=1000;f++){
		let score = 0;
		for(let i=1;i<=10;i++){
			let j = Math.floor(f * i / fsDivN);
			score += frequencyData[j];
			j = Math.floor(f * (i - 0.5) / fsDivN);
			score -= frequencyData[j];
		}
		if(score > s0){
			f0 = f;
			s0 = score;
		}
	}
	F0 = f0;
	console.log("" + F0 + " " + s0);
}

// 描画
let draw = function () {
	canvasContext1.clearRect(0, 0, canvas1.width, canvas1.height);
	canvasContext2.clearRect(0, 0, canvas2.width, canvas2.height);

	canvasContext1.beginPath();
	canvasContext2.beginPath();

	canvasContext1.moveTo(0, 0); canvasContext1.lineTo(canvas1.width, 0); canvasContext1.lineTo(canvas1.width, canvas1.height); canvasContext1.lineTo(0, canvas1.height); canvasContext1.lineTo(0, 0);
	canvasContext2.moveTo(0, 0); canvasContext2.lineTo(canvas2.width, 0); canvasContext2.lineTo(canvas2.width, canvas2.height); canvasContext2.lineTo(0, canvas2.height); canvasContext2.lineTo(0, 0);
	
	for (let i = 0, len = timeDomainData.length; i < len; i++) {// 時間データの描画
		let x = (i / len) * canvas1.width;
		let y = (1 - (timeDomainData[i] / 255)) * canvas1.height;
		if (i == 0) {
			canvasContext1.moveTo(x, y);
		} else {
			canvasContext1.lineTo(x, y);
		}
	}
	const W = 5000;
	for (let i = 0, len = W / fsDivN; i < len; i++) {// 周波数データの描画
		let x = (i / len) * canvas2.width;
		let y = (1 - (frequencyData[i] / 255)) * canvas2.height;
		if (i == 0) {
			canvasContext2.moveTo(x, y);
		} else {
			canvasContext2.lineTo(x, y);
		}
	}

	for (let f = 0; ; f += 2000) {// 周波数の軸ラベル描画
		let text = (f < 1000) ? (f + ' Hz') : ((f / 1000) + ' kHz');
		let i = Math.floor(f / fsDivN);
		if (i >= W / fsDivN) { break; }
		let x = (i / W * fsDivN) * canvas2.width;

		canvasContext2.moveTo(x, 0);
		canvasContext2.lineTo(x, canvas2.height);
		canvasContext2.fillText(text, x, canvas2.height);
	}
	canvasContext2.stroke();
	
	canvasContext2.beginPath();
	{
		canvasContext2.strokeStyle = '#f00';

		let i = Math.floor(F0 / fsDivN);
		let x = (i / W * fsDivN) * canvas2.width;
		let y = (1 - (frequencyData[i] / 255)) * canvas2.height;
		canvasContext2.arc(x, y, 10, 0, 2 * Math.PI);
	}

	// x軸の線とラベル出力
	let textYs = ['1.00', '0.50', '0.00'];
	for (let i = 0, len = textYs.length; i < len; i++) {
		let text = textYs[i];
		let gy = (1 - parseFloat(text)) * canvas1.height;
		canvasContext1.moveTo(0, gy);
		canvasContext1.lineTo(canvas1.width, gy);
		canvasContext1.fillText(text, 0, gy);
	}

	canvasContext1.stroke();
	canvasContext2.stroke();
	
	canvasContext2.strokeStyle = '#000';
}


// 解析開始
let startRecording = function () {
	recordingFlg = true;
	if (audioContext != null) { return; }
	navigator.getUserMedia({ audio: true }, function (stream) {
		audioContext = new AudioContext();

		// 録音関連
		localMediaStream = stream;
		let scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
		localScriptProcessor = scriptProcessor;
		let mediastreamsource = audioContext.createMediaStreamSource(stream);
		mediastreamsource.connect(scriptProcessor);
		scriptProcessor.onaudioprocess = onAudioProcess;
		scriptProcessor.connect(audioContext.destination);

		// 音声解析関連
		audioAnalyser = audioContext.createAnalyser();
		audioAnalyser.minDecibels = -120;
		audioAnalyser.fftSize = 2048;
		audioAnalyser.smoothingTimeConstant = 0.65;
		fsDivN = audioContext.sampleRate / audioAnalyser.fftSize;
		frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
		timeDomainData = new Uint8Array(audioAnalyser.frequencyBinCount);
		mediastreamsource.connect(audioAnalyser);
	},
		function (e) {
			console.log(e);
		});
};

// 解析終了
let endRecording = function () {
	recordingFlg = false;

	//audioDataをサーバに送信するなど終了処理
};