"use client";
import type { AccountMember } from "@ice24/contracts";
import { ButtonLink, EmptyState, StatusTag, Table } from "@ice24/ui";
import { rowLinkId } from "../navigation/return-focus";
import { MEMBER_STATUS, roleName } from "./labels";
import { formatAccess, scopeSummary, type ScopeOptions } from "./model";

/**
 * «Usuarios» of the account configuration (UXD-09): one row per person with role, scope, state
 * and last access; the row opens the person's page, «Invitar usuario» its own screen.
 */
export function UsersTable({
  rows,
  options,
  canInvite,
}: {
  rows: AccountMember[];
  options?: ScopeOptions | undefined;
  canInvite: boolean;
}) {
  return (
    <div className="users-tab">
      {canInvite && (
        <div className="users-tab__actions">
          <ButtonLink variant="primary" icon="user-plus" href="/account/users/invite">
            Invitar usuario
          </ButtonLink>
        </div>
      )}
      <Table<AccountMember>
        caption="Usuarios de la cuenta"
        captionHidden
        rows={rows}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.display_name}
        getRowHref={(row) => `/account/users/${row.id}`}
        getRowLinkId={(row) => rowLinkId(row.id)}
        defaultSort={{ columnId: "name", direction: "ascending" }}
        empty={
          <EmptyState
            title="Sin usuarios"
            description="Invita a las personas que operan o consultan tu cuenta para darles acceso."
          />
        }
        columns={[
          {
            id: "name",
            header: "Nombre",
            mobile: "title",
            cell: (row) => row.display_name,
            sortValue: (row) => row.display_name,
          },
          {
            id: "email",
            header: "Correo",
            cell: (row) => row.email,
            sortValue: (row) => row.email,
          },
          {
            id: "role",
            header: "Rol",
            cell: (row) => row.roles.map(roleName).join(" · "),
            sortValue: (row) => row.roles.map(roleName).join(" "),
          },
          { id: "scope", header: "Alcance", cell: (row) => scopeSummary(row, options) },
          {
            id: "status",
            header: "Estado",
            cell: (row) => {
              const [tone, label] = MEMBER_STATUS[row.status] ?? ["nodata", "Sin estado"];
              return <StatusTag tone={tone}>{label}</StatusTag>;
            },
            sortValue: (row) => MEMBER_STATUS[row.status]?.[1],
          },
          {
            id: "access",
            header: "Último acceso",
            priority: "low",
            cell: (row) => formatAccess(row.last_access_at),
            sortValue: (row) => row.last_access_at ?? "",
          },
        ]}
      />
    </div>
  );
}
