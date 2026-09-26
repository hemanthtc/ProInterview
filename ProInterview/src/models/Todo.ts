import mongoose, { Schema, Document, Model } from "mongoose";

export type TodoPriority = "high" | "medium" | "low";

export interface ITodo extends Document {
    userIdentifier: string;
    title: string;
    priority: TodoPriority;
    targetDate: string; // YYYY-MM-DD
    rolledOver: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
    {
        userIdentifier: { type: String, required: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 300 },
        priority: {
            type: String,
            enum: ["high", "medium", "low"],
            default: "medium",
            index: true,
        },
        targetDate: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
        rolledOver: { type: Boolean, default: false },
    },
    { timestamps: true, collection: "todos" }
);

const Todo: Model<ITodo> =
    mongoose.models.Todo || mongoose.model<ITodo>("Todo", TodoSchema);

export default Todo;
