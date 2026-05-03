import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { getUserById } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'multiwa-super-secret-key-2026';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: 'admin' | 'client';
    };
}

export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
    return await bcrypt.compare(password, hash);
};

export const generateToken = (payload: object) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`[Auth] ❌ No Bearer token for ${req.method} ${req.path}`);
        return res.status(401).json({ error: 'Auth token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token) as any;

    if (!decoded) {
        console.log(`[Auth] ❌ Invalid/Expired token for ${req.method} ${req.path}`);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = getUserById(decoded.id);
    if (!user) {
        console.log(`[Auth] ❌ User not found for ${req.method} ${req.path}`);
        return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
        id: user.id,
        email: user.email,
        role: user.role
    };
    console.log(`[Auth] ✅ ${user.email} -> ${req.method} ${req.path}`);
    next();
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
