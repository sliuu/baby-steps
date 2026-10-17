"use client";

import { useState } from "react";

import { signOut } from "@/app/actions/auth";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/Menu";
import type { SessionUser } from "@/lib/user";

type Props = {
  user: SessionUser;
  /** E.164, or null when texts are off. */
  phone: string | null;
};

export function UserMenu(props: Props) {
  const { user } = props;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Menu>
        <MenuTrigger
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          aria-label={`Account menu for ${user.name}`}
        >
          <Avatar className="size-8">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="bg-raised text-label text-ink">
              {user.initial}
            </AvatarFallback>
          </Avatar>
        </MenuTrigger>

        <MenuContent align="end">
          <MenuLabel className="truncate">{user.email ?? user.name}</MenuLabel>
          <MenuSeparator />
          <MenuItem onSelect={() => setSettingsOpen(true)}>settings</MenuItem>
          {/* POST, so an embedded GET can't sign you out. */}
          <form action={signOut}>
            <MenuItem asChild>
              <button type="submit" className="w-full">
                sign out
              </button>
            </MenuItem>
          </form>
        </MenuContent>
      </Menu>
      {settingsOpen && (
        <SettingsDialog
          phone={props.phone}
          email={user.email || null}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}
