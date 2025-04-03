"use client";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState, useMemo } from "react";
import { Task } from "../types";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function TasksTable<TData extends { completed?: boolean; isNextTask?: boolean }, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  // Sort data to push completed tasks to the bottom and next task to the top
  const sortedData = useMemo(() => {
    // Create a new array to avoid mutating the original data
    return [...data].sort((a, b) => {
      // First, sort by completion status
      const aCompleted = !!a.completed;
      const bCompleted = !!b.completed;
      
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }
      
      // If both have the same completion status, sort by next task status
      const aIsNextTask = !!a.isNextTask;
      const bIsNextTask = !!b.isNextTask;
      
      if (aIsNextTask !== bIsNextTask) {
        return aIsNextTask ? -1 : 1;
      }
      
      // If both have the same completion and next task status, keep original order
      return 0;
    });
  }, [data]);

  const table = useReactTable({
    data: sortedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              // With our type constraint, we can safely access the properties
              const isCompleted = !!row.original.completed;
              const isNextTask = !!row.original.isNextTask;
              
              // Combine classes for different states
              const rowClassName = [
                isCompleted ? "bg-muted/50" : "",
                isNextTask ? "border-2 border-blue-500" : ""
              ].filter(Boolean).join(" ");
              
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={rowClassName}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="overflow-hidden">
                      <div className={`overflow-hidden ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No tasks for this job yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}