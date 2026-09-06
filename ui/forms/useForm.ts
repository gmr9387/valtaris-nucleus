import { useState } from "react";

export const useForm = (initial) => {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setValues({ ...values, [field]: value });
  };

  const validate = (rules) => {
    const newErrors = {};
    Object.keys(rules).forEach((field) => {
      const rule = rules[field];
      const value = values[field];
      const error = rule(value);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return { values, set, errors, validate };
};

