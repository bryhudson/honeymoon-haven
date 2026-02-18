import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

// ---------------------------------------------------------------------------
// cn() — Tailwind class merger (clsx + tailwind-merge)
// ---------------------------------------------------------------------------

describe('cn (Tailwind class merger)', () => {
    // --- Basic merging ---

    it('returns an empty string with no arguments', () => {
        expect(cn()).toBe('');
    });

    it('returns a single class unchanged', () => {
        expect(cn('foo')).toBe('foo');
    });

    it('merges multiple class strings separated by a space', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('merges three class strings', () => {
        expect(cn('a', 'b', 'c')).toBe('a b c');
    });

    // --- Falsy value exclusion ---

    it('excludes false values', () => {
        expect(cn('base', false, 'end')).toBe('base end');
    });

    it('excludes undefined values', () => {
        expect(cn('base', undefined, 'end')).toBe('base end');
    });

    it('excludes null values', () => {
        expect(cn('base', null, 'end')).toBe('base end');
    });

    it('excludes empty strings', () => {
        expect(cn('', 'class')).toBe('class');
    });

    it('excludes 0 (falsy number)', () => {
        // clsx excludes 0 by default
        expect(cn(0 as any, 'class')).toBe('class');
    });

    // --- Object syntax ---

    it('includes class when object value is true', () => {
        expect(cn({ active: true })).toBe('active');
    });

    it('excludes class when object value is false', () => {
        expect(cn({ active: false, base: true })).toBe('base');
    });

    it('handles mixed object conditions', () => {
        const result = cn({ 'text-red': true, 'font-bold': false, 'p-4': true });
        expect(result).toContain('text-red');
        expect(result).toContain('p-4');
        expect(result).not.toContain('font-bold');
    });

    // --- Array syntax ---

    it('flattens array of strings', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('flattens nested arrays', () => {
        expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
    });

    // --- Tailwind-merge conflict resolution (last wins) ---

    it('resolves conflicting text color classes (last wins)', () => {
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('resolves conflicting padding classes (last wins)', () => {
        expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('resolves conflicting flex-direction classes (last wins)', () => {
        expect(cn('flex-row', 'flex-col')).toBe('flex-col');
    });

    it('resolves conflicting background color classes (last wins)', () => {
        expect(cn('bg-red-500', 'bg-green-500')).toBe('bg-green-500');
    });

    it('resolves conflicting hover variant classes', () => {
        expect(cn('hover:text-red-500', 'hover:text-blue-500')).toBe('hover:text-blue-500');
    });

    it('keeps non-conflicting classes from both arguments', () => {
        const result = cn('flex items-center', 'p-4 text-sm');
        expect(result).toContain('flex');
        expect(result).toContain('items-center');
        expect(result).toContain('p-4');
        expect(result).toContain('text-sm');
    });

    // --- Real-world conditional patterns ---

    it('conditional class with ternary expression', () => {
        const isActive = true;
        expect(cn('btn', isActive ? 'btn-active' : 'btn-inactive')).toBe('btn btn-active');
    });

    it('conditional class with && expression', () => {
        const isError = true;
        expect(cn('input', isError && 'border-red-500')).toBe('input border-red-500');
    });

    it('conditional class with && expression (falsy skips class)', () => {
        const isError = false;
        expect(cn('input', isError && 'border-red-500')).toBe('input');
    });

    it('combines object, array, and string syntaxes', () => {
        const result = cn('base', ['extra', 'classes'], { conditional: true });
        expect(result).toContain('base');
        expect(result).toContain('extra');
        expect(result).toContain('classes');
        expect(result).toContain('conditional');
    });
});
