import { useEffect, useState } from 'react';

export const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T) => void] => {
	// State to store our value
	// Pass initial state function to useState so logic is only executed once
	const [storedValue, setStoredValue] = useState<T>(() => {
		try {
			// Get from local storage by key
			const item = process.browser && window.localStorage.getItem(key);
			// Parse stored json or if none return initialValue
			return item ? JSON.parse(item) : initialValue;
		}
		catch (error) {
			// If error also return initialValue
			console.log(error);
			return initialValue;
		}
	});

	// Whenever the value stored changes, update the local storage.
	useEffect(() => {
		try {
			// Updates local storage
			window.localStorage.setItem(key, JSON.stringify(storedValue));
		}
		catch (error) {
			// A more advanced implementation would handle the error case
			console.log('Error updating localstorage:', error);
		}
	}, [storedValue]);

	return [storedValue, setStoredValue];
};
