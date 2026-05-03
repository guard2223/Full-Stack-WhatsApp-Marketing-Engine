import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  phoneNumber: string;
  name?: string;
  tags: string[];
  groupIds: mongoose.Types.ObjectId[];
  isValidatedOnWhatsApp: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema({
  phoneNumber: { type: String, required: true, unique: true },
  name: { type: String, required: false },
  tags: [{ type: String }],
  groupIds: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
  isValidatedOnWhatsApp: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

export default mongoose.model<IContact>('Contact', ContactSchema);
