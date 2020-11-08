import Head from 'next/head';
import React from 'react';
import styled from 'styled-components';
import Footer from '../../components/layout/footer';
import Navbar from '../../components/layout/navbar';

const Main = styled.div`
	width: 100%;
	height: 100%;
	font-size: 32px;
	overflow-y: auto;
`;

/**
* Visit https://schema.org/docs/full.html for a list of all types to put here
*/
// TODO - change this
const JSONLD = `{
	"@context": "http://schema.org/",
	"@type": "Thing",
	"name": "your site thing",
	"image": "/images/logo.png"
}`;

let localConnection: RTCPeerConnection;
const remoteConnections: RTCDataChannel[] = [];

const getICEs = () => {
	localConnection = new RTCPeerConnection();
	localConnection.onicecandidate = () => {
		console.log(' NEW ice candidnat!! on localconnection reprinting SDP ');
		const icesP = document.getElementById('ices')!;
		icesP.innerText += JSON.stringify(localConnection.localDescription) + '\n\n';
		console.log(JSON.stringify(localConnection.localDescription));
	};


	const sendChannel = localConnection.createDataChannel('sendChannel');
	sendChannel.onmessage = e => {
		console.log('messsage received!!! ' + e.data);
		const messages = document.getElementById('message')!;
		messages.innerText += '\n' + e.data;

	};
	sendChannel.onopen = () => console.log('open!!!!');
	sendChannel.onclose = () => console.log('closed!!!!!!');


	localConnection.createOffer().then(o => localConnection.setLocalDescription(o));

};

const setupRemoteConnection = (offer: any) => {

	const remoteConnection = new RTCPeerConnection();

	remoteConnection.onicecandidate = () => {
		console.log(' NEW answer! on localconnection reprinting SDP ');
		console.log(JSON.stringify(remoteConnection.localDescription));
		const answer = document.getElementById('answerText')!;
		answer.innerText = '\n' + JSON.stringify(remoteConnection.localDescription);
	};


	remoteConnection.ondatachannel = event => {

		const receiveChannel = event.channel;
		receiveChannel.onmessage = e => console.log('messsage received!!! ' + e.data);
		receiveChannel.onopen = () => {
			console.log('open!!!!');
		};
		receiveChannel.onclose = () => console.log('closed!!!!!!');
		remoteConnections.push(receiveChannel);

	};


	remoteConnection.setRemoteDescription(offer).then(() => console.log('done'));

	// create answer
	remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(() =>
		console.log(JSON.stringify(remoteConnection.localDescription)));
	// send the anser to the client
};

const p2pConnection = () => {
	const iceInput = document.getElementById('ice') as HTMLInputElement;
	const ice = iceInput.value;
	iceInput.value = '';
	setupRemoteConnection(JSON.parse(ice));
};

const p2pAnswer = () => {
	const answerInput = document.getElementById('answer') as HTMLInputElement;
	const answer = answerInput.value;
	answerInput.value = '';
	localConnection.setRemoteDescription(JSON.parse(answer)).then(() => console.log('done'));
};

const sendP2PText = () => {
	const textInput = document.getElementById('text') as HTMLInputElement;
	const text = textInput.value;
	textInput.value = '';
	console.log('sendP2PText -> remoteConnections', remoteConnections);
	const name = (document.getElementById('name') as HTMLInputElement).value;
	remoteConnections.forEach(remoteConnection =>
		remoteConnection.send(name ? `${name} ${text}` : `Guest: ${text}`)
	);
};

export default function Home() {

	React.useEffect(() => {
		getICEs();
	}, []);

	return (
		<>
			<Head>
				<title>My Home Page Title</title>
				{/* TODO - add real url */}
				<link rel="canonical" href="https://my-domain.com/home" />

				{/* This is json-ld with schema data */}
				<script type='application/ld+json'>{JSONLD}</script>
			</Head>
			<Navbar />
			<Main>
				<h1>Hello!</h1>
				<input id="name" type="text" placeholder="Your name" />
				<br />
				<input id="ice" type="text" />
				<button onClick={p2pConnection}>Connect (ICE)</button>
				<br />
				<input id="answer" type="text" />
				<button onClick={p2pAnswer}>Answer (ICE)</button>
				<br />
				<input id="text" type="text" />
				<button onClick={sendP2PText} >Send to connections</button>
				<br /><br />
				<p style={{ fontSize: '26px' }} >Messages</p>
				<p id="message" style={{ fontSize: '16px' }} ></p>
				<p style={{ fontSize: '26px' }} >Answer</p>
				<p id="answerText" style={{ fontSize: '16px' }} >none yet</p>
				<p style={{ fontSize: '26px' }} >Ices</p>
				<p id="ices" style={{ fontSize: '16px' }} ></p>
			</Main>
			<Footer />
		</>
	);
}
