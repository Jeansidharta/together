import Axios from 'axios';
import Head from 'next/head';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import Footer from '../../components/layout/footer';
import Navbar from '../../components/layout/navbar';
import { useArrayState } from '../../libs/useArrayState';
import { useLocalStorage } from '../../libs/useLocalStorage';

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
const remoteConnections: { [id: number]: RTCDataChannel } = {};

const firebaseFunctions = Axios.create(
	{ baseURL: 'https://us-central1-together-748f7.cloudfunctions.net/api/' }
);

export const Home = () => {

	let [userName, setUserName] = useLocalStorage<string>('userName', '');
	const [answerText, setAnswerText] = useState<string>('None yet');

	const [ices, setIces] = useArrayState<string>([]);
	const [connections, setConnections] = useArrayState<number>([]);
	const [messages, setMessages] = useArrayState<string>([]);

	const inputIce = useRef<HTMLInputElement>(null);
	const inputAnswer = useRef<HTMLInputElement>(null);
	const inputText = useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		firebaseFunctions.post('clearIces', { name: userName }).then(
			() => {
				getICEs();
				// Look for connections
				// setInterval(async () => {
				// 	const ices = await firebaseFunctions.get('getIces');
				// 	for (const user of Object.keys(ices)) {
				// 		if (user === userName) {
				// 			continue;
				// 		}
				// 		// TODO: check if not connect to that user already
				// 		// await p2pAnswerCallback(answer);
				// 	}
				// }, 5000);

				// // Look for answers
				// setInterval(async () => {
				// 	const answers = await firebaseFunctions.get('answers');
				// 	for (const answer of answers) {
				// 		await p2pAnswerCallback(answer);
				// 	}
				// }, 5000);
			}
		);
	}, []);

	const getICEs = () => {
		localConnection = new RTCPeerConnection();
		localConnection.onicecandidate = () => {
			console.log(' NEW ice candidnat!! on localconnection reprinting SDP ');

			while (!userName) {
				userName = prompt('What\'s your name?')!;
			}
			setUserName(userName);
			firebaseFunctions.post('saveIce', {
				name: userName,
				ice: localConnection.localDescription
			});

			const newIce = JSON.stringify(localConnection.localDescription);
			ices.push(newIce);
			setIces(ices);
		};


		const sendChannel = localConnection.createDataChannel('sendChannel');
		sendChannel.onmessage = e => {
			console.log('messsage received!!! ' + e.data);
			messages.push(e.data);
			setMessages(messages);
		};

		sendChannel.onopen = () => console.log('open!!!!');
		sendChannel.onclose = () => console.log('closed!!!!!!');


		localConnection.createOffer().then(o => localConnection.setLocalDescription(o));

	};

	const setupRemoteConnection = (offer: any) => {

		const remoteConnection = new RTCPeerConnection();

		remoteConnection.onicecandidate = () => {
			console.log(' NEW answer! on localconnection reprinting SDP ');
			const newAnswer = JSON.stringify(remoteConnection.localDescription);
			console.log(newAnswer);
			setAnswerText('\n' + newAnswer);
		};


		remoteConnection.ondatachannel = event => {

			const receiveChannel = event.channel;
			receiveChannel.onmessage = e => console.log('messsage received!!! ' + e.data);
			receiveChannel.onopen = () => {
				console.log('open!!!!', receiveChannel);
				connections.push(receiveChannel.id!);
				setConnections(connections);
			};
			receiveChannel.onclose = () => {
				delete remoteConnections[receiveChannel.id!];
				connections.splice(connections.indexOf(receiveChannel.id!));
				setConnections(connections);
				// TODO: clear ice on server
			};
			console.log('setupRemoteConnection -> receiveChannel', receiveChannel);
			remoteConnections[receiveChannel.id!] = receiveChannel;

		};


		remoteConnection.setRemoteDescription(offer).then(() => console.log('done'));

		// create answer
		remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(() =>
			console.log(JSON.stringify(remoteConnection.localDescription)));
		// send the anser to the client
	};

	const p2pConnection = () => {
		if (inputIce.current?.value) {
			setupRemoteConnection(JSON.parse(inputIce.current.value));
			inputIce.current.value = '';
		}
	};

	// const p2pAnswerCallback = (answerText: string) => {
	// 	const answer = JSON.parse(answerText);
	// 	localConnection.setRemoteDescription(answer).then(
	// 		() => console.log('done')
	// 	);
	// };

	const p2pAnswerOnClick = () => {
		if (inputAnswer.current?.value) {
			const answer = JSON.parse(inputAnswer.current.value);
			inputAnswer.current.value = '';
			localConnection.setRemoteDescription(answer).then(
				() => console.log('done')
			);
		}
	};

	const sendP2PText = () => {
		if (inputText.current?.value) {
			const text = inputText.current.value;
			inputText.current.value = '';
			console.log('sendP2PText -> remoteConnections', remoteConnections);
			Object.values(remoteConnections).forEach(remoteConnection =>
				remoteConnection.send(`${userName}: ${text}`)
			);
		}
	};

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
				<h1>Hello {userName}</h1>
				<br />
				<input ref={inputIce} type="text" />
				<button onClick={p2pConnection}>Connect (ICE)</button>
				<br />
				<input ref={inputAnswer} type="text" />
				<button onClick={p2pAnswerOnClick}>Answer (ICE)</button>
				<br />
				<input ref={inputText} type="text" />
				<button onClick={sendP2PText} >Send to connections</button>
				<br /><br />
				<p style={{ fontSize: '26px' }} >Connections</p>
				{connections.map((connection, index) =>
					<p key={index} style={{ fontSize: '16px' }}>{connection}</p>
				)}
				<p style={{ fontSize: '26px' }} >Messages</p>
				{messages.map((message, index) =>
					<p key={index} style={{ fontSize: '16px' }}>{message}</p>
				)}
				<p style={{ fontSize: '26px' }} >Answer</p>
				<p style={{ fontSize: '16px' }} >{answerText}</p>
				<p style={{ fontSize: '26px' }} >Ices</p>
				{ices.map((ice, index) =>
					<p key={index} style={{ fontSize: '16px' }}>{ice}</p>
				)}
			</Main>
			<Footer />
		</>
	);
};
