"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Layers, ChevronDown, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  editable?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onSettingsClick?: () => void;
  // Project switcher (dashboard only). When projects is provided, a dropdown
  // replaces the static brand name so the active project can be switched.
  projects?: Project[];
  activeProjectId?: string;
  onSwitchProject?: (projectId: string) => void;
  onCreateProject?: (name: string) => void;
}

export function TopBar({
  title,
  showBack,
  editable,
  onTitleChange,
  onSettingsClick,
  projects,
  activeProjectId,
  onSwitchProject,
  onCreateProject,
}: TopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditValue(title || "");
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange?.(trimmed);
    } else {
      setEditValue(title || "");
    }
    setIsEditing(false);
  };

  const hasSwitcher = Array.isArray(projects) && projects.length > 0;

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
      {showBack && (
        <Link href="/">
          <Button variant="ghost" size="icon" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      )}
      {hasSwitcher ? (
        <ProjectSwitcher
          projects={projects!}
          activeProjectId={activeProjectId}
          onSwitchProject={onSwitchProject}
          onCreateProject={onCreateProject}
        />
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-5 w-5 text-accent shrink-0" />
          {isEditing && editable ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setEditValue(title || "");
                  setIsEditing(false);
                }
              }}
              className="font-semibold text-sm bg-transparent border-b-2 border-accent outline-none py-0.5 min-w-[120px]"
            />
          ) : (
            <span
              className={`font-semibold text-sm truncate ${editable ? "cursor-pointer hover:text-accent transition-colors" : ""}`}
              onClick={() => editable && startEditing()}
              title={editable ? "Click to rename" : undefined}
            >
              {title || "Carousel Studio"}
            </span>
          )}
        </div>
      )}
      <div className="flex-1" />
      {onSettingsClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </header>
  );
}

interface ProjectSwitcherProps {
  projects: Project[];
  activeProjectId?: string;
  onSwitchProject?: (projectId: string) => void;
  onCreateProject?: (name: string) => void;
}

function ProjectSwitcher({
  projects,
  activeProjectId,
  onSwitchProject,
  onCreateProject,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  const active =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (creating) newNameRef.current?.focus();
  }, [creating]);

  const submitNew = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onCreateProject?.(trimmed);
      setNewName("");
      setCreating(false);
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 min-w-0 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Layers className="h-5 w-5 text-accent shrink-0" />
        <span className="font-semibold text-sm truncate">
          {active?.name || "studio.soluta"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 w-60 rounded-lg border border-border bg-surface shadow-md py-1 z-50"
        >
          <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            프로젝트
          </div>
          {projects.map((p) => (
            <button
              key={p.id}
              role="menuitem"
              onClick={() => {
                if (p.id !== active?.id) onSwitchProject?.(p.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === active?.id && (
                <Check className="h-4 w-4 text-accent shrink-0" />
              )}
            </button>
          ))}

          <div className="my-1 border-t border-border" />

          {creating ? (
            <div className="px-3 py-2">
              <input
                ref={newNameRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitNew();
                  if (e.key === "Escape") {
                    setNewName("");
                    setCreating(false);
                  }
                }}
                placeholder="새 프로젝트 이름"
                className="w-full text-sm bg-transparent border-b-2 border-accent outline-none py-1"
              />
            </div>
          ) : (
            <button
              role="menuitem"
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-accent hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4 shrink-0" />
              새 프로젝트
            </button>
          )}
        </div>
      )}
    </div>
  );
}
