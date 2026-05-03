import { Request, Response } from 'express';
import Contact from '../models/Contact';
import Group from '../models/Group';

export const importContacts = async (req: Request, res: Response) => {
    try {
        const { contacts, groupId } = req.body; // Expects an array of phone numbers or objects
        
        let inserted = 0;
        const validContacts = [];

        for(const c of contacts) {
            const phoneNumber = typeof c === 'string' ? c : c.phoneNumber;
            validContacts.push({
                phoneNumber: phoneNumber.replace(/\D/g, ''),
                name: c.name || '',
                groupIds: groupId ? [groupId] : []
            });
        }

        // Use bulkWrite or insertMany (ignoring duplicates)
        for(const vc of validContacts) {
           try {
               await Contact.updateOne(
                   { phoneNumber: vc.phoneNumber },
                   { $set: { name: vc.name }, $addToSet: { groupIds: vc.groupIds } },
                   { upsert: true }
               );
               inserted++;
           } catch (e) {
               // duplicate or error
           }
        }

        if (groupId) {
            await Group.findByIdAndUpdate(groupId, { $inc: { contactsCount: inserted } });
        }

        res.json({ success: true, inserted, total: contacts.length });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getContacts = async (req: Request, res: Response) => {
    try {
        const contacts = await Contact.find().limit(100);
        res.json({ success: true, contacts });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};
