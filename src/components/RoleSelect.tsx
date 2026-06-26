"use client";

import React, { useState } from 'react';
import { MultiValue, ActionMeta, StylesConfig } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import makeAnimated from 'react-select/animated';
import { X, Briefcase } from 'lucide-react';

// Define the Option shape
export interface OptionType {
  value: string;
  label: string;
}

// Props interface to make component highly reusable
interface RoleSelectProps {
  options: OptionType[];
  maxLimit?: number;
  placeholder?: string;
  onChange: (selectedValues: string[]) => void;
  defaultValue?: OptionType[];
}

// Initialize the animated components hook from react-select
const animatedComponents = makeAnimated();

/**
 * RoleSelect
 * A highly reusable, customized multi-select drop down using react-select.
 */
export default function RoleSelect({ 
    options, 
    maxLimit = 3, 
    placeholder = "Select preferred roles...", 
    onChange,
    defaultValue = []
}: RoleSelectProps) {
  const [selectedOptions, setSelectedOptions] = useState<MultiValue<OptionType>>(defaultValue);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handler for select changes
  const handleChange = (
    newValue: MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>
  ) => {
    // 4. Checking the maximum selection limit
    if (newValue.length > maxLimit) {
      // Prevent selection of more than 3
      return; 
    }
    
    // Show limit message immediately if exactly max limit is reached
    if (newValue.length === maxLimit) {
      setErrorMsg(`You have reached the maximum limit of ${maxLimit} roles.`);
    } else {
      setErrorMsg("");
    }
    
    setSelectedOptions(newValue);
    
    // Pass just the string values back to parent component
    onChange(newValue.map(option => option.value));
  };

  const handleRemove = (valueToRemove: string) => {
    // Cast strict type filter array.
    const updated = selectedOptions.filter(opt => opt.value !== valueToRemove) as MultiValue<OptionType>;
    setSelectedOptions(updated);
    onChange(updated.map(opt => opt.value));
    
    // Only clear the top message if we dropped below the limit threshold
    if (updated.length < maxLimit) {
        setErrorMsg("");
    }
  };

  // 7. Clear all button explicitly outside of react-select (as per requirements)
  const handleClearAll = () => {
    setSelectedOptions([]);
    onChange([]);
    setErrorMsg("");
  };

  // 6. Custom styling specifically tailored to overriding defaults for Dark Mode aesthetics
  const customStyles: StylesConfig<OptionType, true> = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderColor: state.isFocused ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
      padding: '4px',
      borderRadius: '0.75rem',
      cursor: 'text',
      boxShadow: state.isFocused ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none',
      ':hover': {
        borderColor: '#6366f1'
      }
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#1a1a1a', // Solid background to prevent transparency overlap
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      zIndex: 9999, // Extremely high to stay on top
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.7)'
    }),
    menuList: (base) => ({
      ...base,
      backgroundColor: '#1a1a1a', // Solid background for list container
      maxHeight: '250px',
      overflowY: 'auto',
      /* custom scrollbar overrides if needed */
      '::-webkit-scrollbar': {
        width: '6px',
      },
      '::-webkit-scrollbar-thumb': {
        background: '#4f46e5',
        borderRadius: '10px'
      }
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? '#4f46e5' 
        : state.isFocused 
          ? 'rgba(99, 102, 241, 0.25)' 
          : '#1a1a1a', // Opaque solid background for options
      color: '#fff',
      padding: '12px 16px',
      cursor: 'pointer',
      ':active': {
        backgroundColor: '#6366f1'
      }
    }),
    input: (base) => ({
      ...base,
      color: 'white',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'rgba(255,255,255,0.4)',
      fontSize: '0.875rem'
    }),
    multiValue: () => ({
        // We actually hide inside dropdown multi-values because we display them below!
        display: 'none'
    })
  };

  if (!isMounted) {
    return <div className="h-24 w-full animate-pulse bg-white/5 rounded-xl"></div>;
  }

  return (
    <div className="w-full relative z-50">
      <div className="flex justify-between items-center mb-2">
         <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
             <Briefcase className="w-4 h-4 text-indigo-400" />
             Preferred Roles (Max {maxLimit})
             {/* 8. Validation Label */}
             <span className="text-red-400 text-xs ml-1">*Required</span>
         </label>
         {selectedOptions.length > 0 && (
            <button 
                onClick={handleClearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
                <X className="w-3 h-3" /> Clear All
            </button>
         )}
      </div>

      {/* 3. Searchable Dropdown with makeAnimated and closeMenuOnSelect=true */}
      <CreatableSelect
        isMulti
        name="roles"
        options={options}
        className="role-select-container"
        classNamePrefix="react-select"
        onChange={handleChange}
        value={selectedOptions}
        components={animatedComponents}
        closeMenuOnSelect={true}
        placeholder={placeholder}
        styles={customStyles}
        formatCreateLabel={(inputValue) => `Add "${inputValue}" as custom role`}
      />

      {errorMsg && (
          <p className="text-red-400 text-xs mt-2 font-medium animate-in slide-in-from-top-1">{errorMsg}</p>
      )}

      {/* 9. Display active selections cleanly below the actual dropdown box */}
      {selectedOptions.length > 0 && (
          <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Actively Selected Roles</p>
              <div className="flex flex-wrap gap-2">
                  {selectedOptions.map((opt) => (
                      <span key={opt.value} className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 rounded-lg text-sm font-medium flex items-center shadow-sm">
                          {opt.label}
                          <button 
                            type="button" 
                            onClick={() => handleRemove(opt.value)} 
                            className="ml-2 hover:bg-red-500/30 text-white/50 hover:text-white rounded-full p-0.5 transition-colors flex items-center justify-center flex-shrink-0"
                            title="Remove"
                          >
                              <X className="w-3 h-3" />
                          </button>
                      </span>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}
