import { createField } from "./createField";
import { createFieldGroup } from "./createFieldGroup";
import { createForm } from "./createForm";
import { createFormGroup } from "./createFormGroup";
import { useStore } from "./store";

/** `react-form`'s name for `createForm`. The same function. */
export const useForm = createForm;

/** `react-form`'s name for `createField`. The same function. */
export const useField = createField;

/** `react-form`'s name for `createFieldGroup`. The same function. */
export const useFieldGroup = createFieldGroup;

/** `react-form`'s name for `createFormGroup`. The same function. */
export const useFormGroup = createFormGroup;

/** `solid-form`'s top-level `useSelector`, which is `useStore` here. The same function. */
export const useSelector = useStore;
