"use client";
import Link from "next/link";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavigationProps {
  currentPage: "students" | "placements" | "stats";
  userName: string;
  userRole: "admin" | "student";
}

export function Navigation({
  currentPage,
  userName,
  userRole,
}: NavigationProps) {
  return (
    <header className="h-[80px] border-b border-border bg-white sticky top-0 z-50 px-10">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-[24px] font-bold text-foreground">
          !index
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center gap-12">
          <NavItem
            href="/students"
            label="Students"
            isActive={currentPage === "students"}
          />
          <NavItem
            href="/placements"
            label="Placements"
            isActive={currentPage === "placements"}
          />
          <NavItem
            href="/stats"
            label="Stats"
            isActive={currentPage === "stats"}
          />
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-secondary p-2 rounded-lg transition-colors outline-none">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={`https://avatar.vercel.sh/${userName}`} />
                <AvatarFallback>{userName[0]}</AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userRole}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-2 mt-2 border-border shadow-md"
            >
              <DropdownMenuItem className="h-11 cursor-pointer gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-base">Your Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="h-11 cursor-pointer gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="text-base">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="h-11 cursor-pointer gap-3 text-destructive focus:text-destructive">
                <LogOut className="h-5 w-5" />
                <span className="text-base">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function NavItem({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative py-2 text-[18px] font-medium transition-colors hover:text-primary",
        isActive ? "text-primary" : "text-muted-foreground",
      )}
    >
      {label}
      {isActive && (
        <div className="absolute bottom-[-28px] left-0 right-0 h-1 bg-primary rounded-full" />
      )}
    </Link>
  );
}
