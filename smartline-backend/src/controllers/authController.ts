import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const checkPhone = async (req: Request, res: Response) => {
    const { phone } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('phone', phone)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            throw error;
        }

        if (data) {
            res.json({ exists: true });
        } else {
            res.json({ exists: false });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const signup = async (req: Request, res: Response) => {
    const { phone, password, role, name, email } = req.body;

    try {
        // 1. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. Insert into DB
        const { data, error } = await supabase
            .from('users')
            .insert({
                phone,
                password_hash: hashedPassword,
                role: role || 'customer',
                full_name: name,
                email: email
            })
            .select()
            .single();

        if (error) throw error;

        // 3. Generate Token
        const token = jwt.sign({ id: data.id, role: data.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.status(201).json({ user: data, token });
    } catch (error: any) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    const { phone, password } = req.body;

    try {
        // 1. Find User
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .single();

        if (!user || error) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Check Password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 3. Generate Token
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.json({ user, token });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
