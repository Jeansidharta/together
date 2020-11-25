import { useState } from 'react';

export const useArrayState = <T>(initialValue?: T[]): [T[], (value: T[]) => void] => {

	const [value, setValue] = useState<T[]>(initialValue ?? []);

	const arraySetValue = (newValue: T[]) => {
		setValue([...newValue]);
	};

	return [value, arraySetValue];
};
