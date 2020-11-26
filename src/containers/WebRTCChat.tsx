import axios from 'axios';
import React, { useRef, useState } from 'react';
import { useArrayState } from '../libs/useArrayState';
import { useLocalStorage } from '../libs/useLocalStorage';

let localConnection: RTCPeerConnection;
const remoteConnections: { [id: number]: RTCDataChannel } = {};

const isProd = process.env.NODE_ENV === 'production';
const shouldRunLocalFunction = true;
const debugHttp = false;
const isLocalFunction = !isProd && shouldRunLocalFunction;

const baseURL = isLocalFunction ?
	'http://localhost:5001/together-748f7/us-central1/api' :
	'https://us-central1-together-748f7.cloudfunctions.net/api/';


const firebaseFunctions = axios.create({ baseURL });

export const WebRTCChat = () => {

	let [userName, setUserName] = useLocalStorage<string>('userName', '');
	const [answerText, setAnswerText] = useState<string>('None yet');

	const [ices, setIces] = useArrayState<string>([]);
	const [connections, setConnections] = useArrayState<string>([]);
	const [messages, setMessages] = useArrayState<string>([]);

	const inputText = useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		const usersPooling = () => {
			setupLocalConnection();

			setInterval(async () => {
				connectToNewUsers();
			}, 5000);

			// Look for answers
			setInterval(async () => {
				confirmAnswers();
			}, 6000);
		};

		(async () => {
			debugHttp && userName && console.log('delete ices');
			userName && await firebaseFunctions.delete(`ices/${userName}`);
			usersPooling();
		})();

	}, []);

	//

	const connectToNewUsers = async () => {
		debugHttp && console.log('get ices/all');
		const { data: ices } = await firebaseFunctions.get('ices/all');
		for (const user of Object.keys(ices)) {
			if (
				user === userName ||
				connections.includes(user) ||
				!Array.isArray(ices[user]) ||
				ices[user].length === 0
			) {
				continue;
			}
			connections.push(user); // TODO: set it as pending
			console.log('trying to connect to new user', user);
			// TODO: how to chose a offer?
			const offer = ices[user][0];
			setupOfferFromUser(offer, user);
		}
		setConnections(connections);
	};

	const confirmAnswers = async () => {
		debugHttp && console.log('get answer');
		const { data: answers } = await firebaseFunctions.get(`answer/${userName}`);
		for (const answer of Object.values<string>(answers)) {
			await confirmAnswer(answer);
		}
	};

	//
	const setupLocalConnection = () => {
		localConnection = new RTCPeerConnection();
		localConnection.onicecandidate = () => {

			while (!userName) {
				userName = prompt('What\'s your name?')!;
			}
			setUserName(userName);
			console.log('Novo ICE local, mandando para o server');
			firebaseFunctions.post('ice', {
				name: userName,
				ice: localConnection.localDescription
			});

			const newIce = JSON.stringify(localConnection.localDescription);
			ices.push(newIce);
			setIces(ices);
		};


		const sendChannel = localConnection.createDataChannel('sendChannel');
		sendChannel.onmessage = e => {
			messages.push(e.data);
			setMessages(messages);
		};

		sendChannel.onopen = () => console.log('Send channel is open!!!!');
		sendChannel.onclose = () => {
			// firebaseFunctions.post('clearIces', { name: userName });
			console.log('Send channel is closed!!!!!!');
		};


		localConnection.createOffer().then(o => localConnection.setLocalDescription(o));

	};

	const setupOfferFromUser = (offer: any, otherUserName: string) => {

		const remoteConnection = new RTCPeerConnection();

		remoteConnection.onicecandidate = () => {
			console.log('Resposta de uma conexao remota, mandando para o server');
			const newAnswer = JSON.stringify(remoteConnection.localDescription);
			console.log('Resposta para o usuario', otherUserName, newAnswer);
			firebaseFunctions.post('answer', { from: userName, to: otherUserName, answer: newAnswer });
			setAnswerText('\n' + newAnswer);
		};


		remoteConnection.ondatachannel = event => {

			const receiveChannel = event.channel;
			// TODO: oq fazer com esse evento?
			receiveChannel.onmessage = e => console.log('messsage received!!! ' + e.data);
			receiveChannel.onopen = () => {
				console.log('Conexão remota aberta!!!!');
				// connections.push(otherUserName!);
				// setConnections(connections);
			};
			receiveChannel.onclose = () => {
				delete remoteConnections[receiveChannel.id!];
				connections.splice(connections.indexOf(otherUserName));
				setConnections(connections);
				// TODO: clear ice on server
			};
			console.log('setupRemoteConnection -> receiveChannel', receiveChannel);
			remoteConnections[receiveChannel.id!] = receiveChannel;

		};


		remoteConnection.setRemoteDescription(offer).then(() => console.log('Set de oferta feito'));

		// create answer
		remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(() =>
			// console.log(JSON.stringify(remoteConnection.localDescription);
			0
		);
		// send the anser to the client
	};

	const confirmAnswer = (answerText: string) => {
		const answer = JSON.parse(answerText);
		localConnection.setRemoteDescription(answer).then(
			() => console.log('Resposta confirmada!')
		);
	};

	const sendMessageToEveryConnection = () => {
		if (inputText.current?.value) {
			const text = inputText.current.value;
			inputText.current.value = '';
			console.log('conexoes ao enviar mensagem', remoteConnections);
			const message = `${userName}: ${text}`;
			messages.push(message);
			setMessages(messages);
			Object.values(remoteConnections).forEach(remoteConnection =>
				remoteConnection.send(message)
			);
		}
	};

	return (
		<>
			<h1>Hello {userName}</h1>
			<br />
			<input ref={inputText} type="text" />
			<button onClick={sendMessageToEveryConnection} >Send to connections</button>
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
		</>
	);
};
