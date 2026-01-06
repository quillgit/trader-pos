import React, { useState, useEffect } from 'react';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number | undefined | ''; // Accept number or empty
    onChange: (value: number) => void;
    currency?: string;
}

export function MoneyInput({ value, onChange, currency = 'IDR', className = '', ...props }: MoneyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value === undefined || value === '') {
            setDisplayValue('');
            return;
        }
        const num = Number(value);
        setDisplayValue(num === 0 ? '0' : new Intl.NumberFormat('id-ID').format(num));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        
        if (!rawValue) {
            setDisplayValue('');
            onChange(0);
            return;
        }

        const numValue = Number(rawValue);
        setDisplayValue(new Intl.NumberFormat('id-ID').format(numValue));
        onChange(numValue);
    };

    return (
        <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium select-none">
                {currency === 'IDR' ? 'Rp' : currency}
            </span>
            <input
                type="text"
                inputMode="numeric"
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${className}`}
                value={displayValue}
                onChange={handleChange}
                placeholder="0"
                {...props}
            />
        </div>
    );
}
