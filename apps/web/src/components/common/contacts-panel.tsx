"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { blankToUndefined, formErrorsFromZod, withNulls, type FormErrors } from "@/lib/forms";
import { FormField } from "./form-field";
import { FormDialog } from "./form-overlay";
import { FormFooter } from "./form-parts";
import { EmptyState, ErrorState, TableSkeleton } from "./states";

export interface Contact {
  id: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface ContactPayload {
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export type ContactUpdatePayload = {
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  isPrimary?: boolean;
};

type ContactSchema = {
  safeParse(value: unknown):
    | { success: true; data: ContactPayload }
    | { success: false; error: Parameters<typeof formErrorsFromZod>[0] };
};

export interface ContactSaveHandlers {
  isPending: boolean;
  error: unknown;
  reset: () => void;
  create: (data: ContactPayload, onSuccess: () => void) => void;
  update: (id: string, data: ContactUpdatePayload, onSuccess: () => void) => void;
}

function ContactForm({
  contact,
  schema,
  save,
  onDone,
}: {
  contact?: Contact;
  schema: ContactSchema;
  save: ContactSaveHandlers;
  onDone: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [designation, setDesignation] = useState(contact?.designation ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary ?? false);
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (save.isPending) return;

    const parsed = schema.safeParse({
      name,
      designation: blankToUndefined(designation),
      email: blankToUndefined(email),
      phone: blankToUndefined(phone),
      isPrimary,
    });
    if (!parsed.success) {
      setErrors(formErrorsFromZod(parsed.error));
      return;
    }
    setErrors({ fields: {} });

    if (contact) {
      save.update(
        contact.id,
        withNulls(parsed.data, ["designation", "email", "phone"]) as ContactUpdatePayload,
        onDone
      );
    } else {
      save.create(parsed.data, onDone);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="Name" required error={errors.fields.name}>
        {(control) => (
          <Input {...control} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        )}
      </FormField>
      <FormField label="Designation" error={errors.fields.designation}>
        {(control) => (
          <Input {...control} value={designation} onChange={(e) => setDesignation(e.target.value)} />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" error={errors.fields.email}>
          {(control) => (
            <Input
              {...control}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Phone" error={errors.fields.phone}>
          {(control) => <Input {...control} value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </FormField>
      </div>
      <Label className="flex items-center gap-2">
        <Checkbox checked={isPrimary} onCheckedChange={(checked) => setIsPrimary(checked === true)} />
        Primary contact
      </Label>
      <FormFooter
        isPending={save.isPending}
        submitLabel={contact ? "Save contact" : "Add contact"}
        onCancel={onDone}
        error={save.error}
        formError={errors.form}
      />
    </form>
  );
}

interface ContactsPanelProps {
  contacts: Contact[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  canCreate: boolean;
  canEdit: boolean;
  schema: ContactSchema;
  save: ContactSaveHandlers;
}

/**
 * Contacts table + add/edit dialog, shared by Customer and Supplier detail
 * pages. Each domain supplies its own schema and API-backed save handlers.
 */
export function ContactsPanel({
  contacts,
  isPending,
  isError,
  error,
  onRetry,
  canCreate,
  canEdit,
  schema,
  save,
}: ContactsPanelProps) {
  // undefined = closed, null = adding, Contact = editing.
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined);

  function open(target: Contact | null) {
    save.reset();
    setEditing(target);
  }

  let body: React.ReactNode;
  if (isPending) body = <TableSkeleton columns={5} rows={3} />;
  else if (isError) body = <ErrorState title="Could not load contacts" error={error} onRetry={onRetry} />;
  else if (!contacts || contacts.length === 0) {
    body = (
      <EmptyState
        title="No contacts yet"
        action={
          canCreate && (
            <Button variant="outline" onClick={() => open(null)}>
              Add the first contact
            </Button>
          )
        }
      />
    );
  } else {
    body = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-20">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium">
                {contact.name}
                {contact.isPrimary && (
                  <Badge variant="secondary" className="ml-2">
                    Primary
                  </Badge>
                )}
              </TableCell>
              <TableCell>{contact.designation ?? "—"}</TableCell>
              <TableCell>{contact.email ?? "—"}</TableCell>
              <TableCell>{contact.phone ?? "—"}</TableCell>
              <TableCell>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit contact ${contact.name}`}
                    onClick={() => open(contact)}
                  >
                    Edit
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card className="gap-0 p-0">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4">
        <CardTitle>Contacts</CardTitle>
        {canCreate && (
          <Button size="sm" onClick={() => open(null)}>
            <Plus /> Add contact
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">{body}</CardContent>

      <FormDialog
        open={editing !== undefined}
        onOpenChange={(isOpen) => !isOpen && setEditing(undefined)}
        title={editing ? `Edit ${editing.name}` : "Add contact"}
        description="Only one contact can be primary; choosing this one replaces the current primary."
      >
        {editing !== undefined && (
          <ContactForm
            contact={editing ?? undefined}
            schema={schema}
            save={save}
            onDone={() => setEditing(undefined)}
          />
        )}
      </FormDialog>
    </Card>
  );
}
