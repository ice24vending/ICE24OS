"use client";

import { useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { Icon } from "./icon.js";
import { cx, describedBy } from "./shared.js";

/** Props every form field shares (UI_UX §13.2: visible label, help, required mark and error). */
export interface FieldProps {
  /** Visible label in sentence case. The placeholder never replaces it. */
  readonly label: ReactNode;
  readonly help?: ReactNode | undefined;
  /** Validation message; marks the control invalid and is announced with it. */
  readonly error?: ReactNode | undefined;
  readonly required?: boolean | undefined;
  /** Shows the value without allowing changes (read-only account, no permission to edit). */
  readonly readOnly?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  /** Hides the label visually; it stays as the accessible name. */
  readonly hideLabel?: boolean | undefined;
  readonly id?: string | undefined;
  readonly className?: string | undefined;
}

interface FieldIds {
  readonly id: string;
  readonly helpId: string | undefined;
  readonly errorId: string | undefined;
  readonly describedBy: string | undefined;
}

export function useFieldIds(
  { id, help, error }: Pick<FieldProps, "id" | "help" | "error">,
  extra?: string,
): FieldIds {
  const generated = useId();
  const base = id ?? generated;
  const helpId = help ? `${base}-help` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  return { id: base, helpId, errorId, describedBy: describedBy(extra, helpId, errorId) };
}

export function RequiredMark() {
  return (
    <span className="ids-field__required" aria-hidden>
      *
    </span>
  );
}

export function FieldHelp({
  id,
  children,
}: {
  readonly id?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <p id={id} className="ids-field__help">
      {children}
    </p>
  );
}

export function FieldError({
  id,
  children,
}: {
  readonly id?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <p id={id} className="ids-field__error">
      <Icon name="warning" size={16} />
      <span>{children}</span>
    </p>
  );
}

/**
 * Layout of a labeled field: label, control, help and error. Exported for custom controls that
 * need the same anatomy; give the control `ids.id` and `ids.describedBy`.
 */
export function Field({
  label,
  help,
  error,
  required,
  readOnly,
  disabled,
  hideLabel,
  className,
  ids,
  children,
}: FieldProps & { readonly ids: FieldIds; readonly children: ReactNode }) {
  return (
    <div
      className={cx(
        "ids-field",
        error && "ids-field--invalid",
        readOnly && "ids-field--readonly",
        disabled && "ids-field--disabled",
        className,
      )}
    >
      <label
        htmlFor={ids.id}
        className={cx("ids-field__label", hideLabel && "ids-visually-hidden")}
      >
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {help && <FieldHelp id={ids.helpId}>{help}</FieldHelp>}
      {error && <FieldError id={ids.errorId}>{error}</FieldError>}
    </div>
  );
}

type InputProps = Omit<
  ComponentPropsWithRef<"input">,
  "size" | "prefix" | "type" | keyof FieldProps
>;

export interface TextFieldProps extends FieldProps, InputProps {
  readonly type?: "text" | "email" | "tel" | "url" | "search" | "password" | "number";
  /** Text or unit before the value (e.g. "$"). */
  readonly prefix?: ReactNode;
  /** Unit after the value (UI_UX §13.2 "Campo numérico": "MXN", "°C", "L"). */
  readonly suffix?: ReactNode;
}

/** Single-line text field; 16 px text so mobile browsers do not zoom (UI_UX §7.2). */
export function TextField({
  label,
  help,
  error,
  required,
  readOnly,
  disabled,
  hideLabel,
  id,
  className,
  type = "text",
  prefix,
  suffix,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: TextFieldProps) {
  const ids = useFieldIds({ id, help, error }, ariaDescribedBy);
  const field = { label, help, error, required, readOnly, disabled, hideLabel, className };
  const input = (
    <input
      id={ids.id}
      type={type}
      className="ids-input"
      required={required}
      readOnly={readOnly}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      aria-describedby={ids.describedBy}
      {...rest}
    />
  );
  return (
    <Field {...field} ids={ids}>
      {prefix || suffix ? (
        <span className="ids-input-group">
          {prefix && <span className="ids-input-group__affix">{prefix}</span>}
          {input}
          {suffix && <span className="ids-input-group__affix">{suffix}</span>}
        </span>
      ) : (
        input
      )}
    </Field>
  );
}

export interface TextAreaProps
  extends FieldProps, Omit<ComponentPropsWithRef<"textarea">, keyof FieldProps> {
  /** Shows "n de max caracteres" under the field when `maxLength` is set. */
  readonly showCount?: boolean;
}

export function TextArea({
  label,
  help,
  error,
  required,
  readOnly,
  disabled,
  hideLabel,
  id,
  className,
  showCount = false,
  rows = 4,
  maxLength,
  value,
  defaultValue,
  onChange,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: TextAreaProps) {
  const counting = showCount && maxLength !== undefined;
  const generated = useId();
  const countId = counting ? `${id ?? generated}-count` : undefined;
  const ids = useFieldIds(
    { id: id ?? generated, help, error },
    describedBy(ariaDescribedBy, countId),
  );
  const [uncontrolled, setUncontrolled] = useState(String(defaultValue ?? ""));
  const length = String(value ?? uncontrolled).length;
  const field = { label, help, error, required, readOnly, disabled, hideLabel, className };
  return (
    <Field {...field} ids={ids}>
      <textarea
        id={ids.id}
        className="ids-input ids-textarea"
        rows={rows}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          if (value === undefined) setUncontrolled(event.target.value);
          onChange?.(event);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        {...rest}
      />
      {counting && (
        <p id={countId} className="ids-field__count">
          {length} de {maxLength} caracteres
        </p>
      )}
    </Field>
  );
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps
  extends FieldProps, Omit<ComponentPropsWithRef<"select">, "children" | keyof FieldProps> {
  readonly options: readonly SelectOption[];
  /** First, empty option ("Selecciona una sucursal"). */
  readonly placeholder?: string;
}

/**
 * Native select: the most robust option on mobile and with assistive technology. Read-only mode
 * shows the chosen label in a read-only text box and submits the value in a hidden input, because
 * a native select cannot be read-only.
 */
export function Select({
  label,
  help,
  error,
  required,
  readOnly,
  disabled,
  hideLabel,
  id,
  className,
  options,
  placeholder,
  value,
  defaultValue,
  name,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: SelectProps) {
  const ids = useFieldIds({ id, help, error }, ariaDescribedBy);
  const field = { label, help, error, required, readOnly, disabled, hideLabel, className };
  if (readOnly) {
    const current = String(value ?? defaultValue ?? "");
    const chosen = options.find((option) => option.value === current);
    return (
      <Field {...field} ids={ids}>
        <input
          id={ids.id}
          className="ids-input"
          readOnly
          value={chosen?.label ?? "Sin selección"}
          aria-describedby={ids.describedBy}
        />
        {name && <input type="hidden" name={name} value={current} />}
      </Field>
    );
  }
  return (
    <Field {...field} ids={ids}>
      <span className="ids-select">
        <select
          id={ids.id}
          className="ids-input ids-select__control"
          name={name}
          value={value}
          defaultValue={
            value === undefined ? (defaultValue ?? (placeholder ? "" : undefined)) : undefined
          }
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="ids-select__chevron" />
      </span>
    </Field>
  );
}

export interface DateFieldProps extends Omit<TextFieldProps, "type" | "prefix" | "suffix"> {
  /** Earliest and latest dates as `AAAA-MM-DD`. */
  readonly min?: string;
  readonly max?: string;
  /** `datetime-local` adds the hour, in the time zone of the context (UI_UX §13.2). */
  readonly withTime?: boolean;
}

/**
 * Native date picker: the value is ISO (`AAAA-MM-DD`) and the browser shows it as DD/MM/AAAA
 * with the es-MX locale. The help text says the format for users who type it.
 */
export function DateField({
  withTime = false,
  help = withTime ? "Formato DD/MM/AAAA HH:MM" : "Formato DD/MM/AAAA",
  label,
  error,
  required,
  readOnly,
  disabled,
  hideLabel,
  id,
  className,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: DateFieldProps) {
  const ids = useFieldIds({ id, help, error }, ariaDescribedBy);
  const field = { label, help, error, required, readOnly, disabled, hideLabel, className };
  return (
    <Field {...field} ids={ids}>
      <input
        id={ids.id}
        type={withTime ? "datetime-local" : "date"}
        className="ids-input ids-date"
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        {...rest}
      />
    </Field>
  );
}
