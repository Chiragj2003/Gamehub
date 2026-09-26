"use client";

import React from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";
import { usePlayer } from "@/components/PlayerProvider";

/**
 * Sign in, sign up, and the signed-in avatar.
 *
 * Rendered only when Clerk has keys — with accounts off the site is still
 * fully playable, and an auth button that cannot work is worse than no button.
 * That check lives in Navbar rather than here: `useAuth` runs before any early
 * return this component could make, and without a ClerkProvider above it it
 * throws, which would take down every page rather than just the auth controls.
 * The avatar carries a link to the account page, where the player's tag lives.
 *
 * Signed-in state comes from `useAuth` rather than <SignedIn>/<SignedOut>,
 * which Clerk removed in Core 3, or <Show>, which is an async server
 * component and cannot be used here.
 */
export default function AuthControls() {
  const { tag } = usePlayer();
  const { isLoaded, isSignedIn } = useAuth();

  // Render nothing until Clerk knows: flashing "Sign up" at someone who is
  // already signed in is worse than a beat of empty space.
  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <>
        <SignInButton mode="modal">
          <button
            type="button"
            className="btn-quiet hidden h-9 cursor-pointer items-center rounded-full px-3.5 text-[13px] font-semibold text-ink-2 hover:text-ink sm:inline-flex"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="btn-glow flex h-9 cursor-pointer items-center rounded-full px-4 text-[13px] font-semibold"
          >
            Sign up
          </button>
        </SignUpButton>
      </>
    );
  }

  return (
    <>
      {/* The tag is the point of having an account here, so it is shown
          rather than hidden behind the avatar menu. */}
        {tag && (
          <Link
            href="/account"
            className="hidden max-w-[10rem] truncate rounded-full border border-line px-3 py-1.5 font-mono text-[12px] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink sm:block"
            title={`You play as ${tag}`}
          >
            {tag}
          </Link>
        )}
        <UserButton
          appearance={{ elements: { avatarBox: "h-9 w-9" } }}
          userProfileProps={{ appearance: { elements: { rootBox: "w-full" } } }}
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="Your tag and library"
              labelIcon={<HugeiconsIcon icon={StarIcon} className="h-3.5 w-3.5" />}
              href="/account"
            />
          </UserButton.MenuItems>
      </UserButton>
    </>
  );
}
