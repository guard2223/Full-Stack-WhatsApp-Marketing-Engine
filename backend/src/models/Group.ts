import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  ownerId: string; // the system user ID
  whatsappGroupId?: string; // If this is linked to a physical WhatsApp group
  contactsCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  ownerId: { type: String, required: false, default: 'admin' }, 
  whatsappGroupId: { type: String, required: false },
  contactsCount: { type: Number, default: 0 },
  tags: [{ type: String }],
}, {
  timestamps: true
});

export default mongoose.model<IGroup>('Group', GroupSchema);
