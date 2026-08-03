import React from 'react';
import { Settings, Plus, Trash2, Hash, CaseSensitive, Calendar, Mail, Phone, Home, CheckSquare, Layers, Key, BookOpen } from 'lucide-react';

export type FieldType = 'id' | 'name' | 'email' | 'phone' | 'address' | 'date' | 'number' | 'boolean' | 'category' | 'text' | 'section';

export interface SchemaField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  description?: string;
  rules?: string;
  isActive: boolean;
}

interface SchemaEditorProps {
  fields: SchemaField[];
  onFieldsChange: (fields: SchemaField[]) => void;
  generationMode: 'tabular' | 'document';
}

export const SchemaEditor: React.FC<SchemaEditorProps> = ({ fields, onFieldsChange, generationMode }) => {
  const isDocument = generationMode === 'document';

  const handleFieldChange = (id: string, key: keyof SchemaField, value: any) => {
    const updated = fields.map(f => {
      if (f.id === id) {
        const nextField = { ...f, [key]: value };
        if (key === 'name') {
          nextField.name = String(value)
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_');
        }
        return nextField;
      }
      return f;
    });
    onFieldsChange(updated);
  };

  const handleAddField = () => {
    const newField: SchemaField = isDocument ? {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: `custom_section_${fields.length + 1}`,
      label: `Custom Section ${fields.length + 1}`,
      type: 'section',
      description: 'Custom document section content',
      rules: 'Write comprehensive content for this section.',
      isActive: true
    } : {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: `custom_field_${fields.length + 1}`,
      label: `Custom Field ${fields.length + 1}`,
      type: 'text',
      description: 'Custom user defined field',
      rules: 'Provide realistic values for this field',
      isActive: true
    };
    onFieldsChange([...fields, newField]);
  };

  const handleDeleteField = (id: string) => {
    onFieldsChange(fields.filter(f => f.id !== id));
  };

  const fieldTypes: { value: FieldType; label: string }[] = isDocument ? [
    { value: 'section', label: 'Outline Section' }
  ] : [
    { value: 'id', label: 'Unique ID' },
    { value: 'name', label: 'Full Name' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'address', label: 'Home Address' },
    { value: 'date', label: 'Date/Timestamp' },
    { value: 'number', label: 'Number/Decimal' },
    { value: 'boolean', label: 'True/False' },
    { value: 'category', label: 'Category Option' },
    { value: 'text', label: 'Generic Text' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">
              {isDocument ? 'Document Outline & Sections' : 'Dataset Schema Fields'}
            </h3>
            <p className="text-xs text-slate-400">
              {isDocument ? 'Customize sections and rules for document generation.' : 'Define data columns, constraints, and data types.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleAddField}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Field</span>
        </button>
      </div>

      {/* Field List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {fields.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-6">No fields defined yet. Click "Add Field" to begin.</p>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 text-xs">
              <input
                type="text"
                value={field.label}
                onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                placeholder="Field Label"
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={field.type}
                onChange={(e) => handleFieldChange(field.id, 'type', e.target.value as FieldType)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {fieldTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button
                onClick={() => handleDeleteField(field.id)}
                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
