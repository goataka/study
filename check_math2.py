#!/usr/bin/env python3
"""
Improved math checker that handles decimal formatting differences.
"""
import json
import re
import os
from fractions import Fraction
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP

MATH_DIR = Path("/home/runner/work/study/study/quiz/public/questions/math")

def normalize_number(s):
    """Normalize a numeric string: remove trailing zeros after decimal point."""
    s = s.strip()
    try:
        d = Decimal(s)
        # Remove trailing zeros
        normalized = d.normalize()
        return str(normalized)
    except:
        return s

def answers_match(expected, got):
    """Compare expected and got, handling decimal formatting."""
    if expected == got:
        return True
    try:
        ne = normalize_number(str(expected))
        ng = normalize_number(str(got))
        return ne == ng
    except:
        pass
    # Try fraction comparison
    try:
        from fractions import Fraction
        ef = Fraction(str(expected))
        gf = Fraction(str(got))
        return ef == gf
    except:
        pass
    return False

def parse_fraction(s):
    s = s.strip()
    if '/' in s:
        parts = s.split('/')
        if len(parts) == 2:
            try:
                return Fraction(int(parts[0].strip()), int(parts[1].strip()))
            except:
                return None
    try:
        # Try as int or float
        f = Fraction(s)
        return f
    except:
        return None

def fraction_to_str(f):
    if f.denominator == 1:
        return str(f.numerator)
    return f"{f.numerator}/{f.denominator}"

def extract_math_basic(question):
    """Extract and compute arithmetic from question text. Returns expected answer or None."""
    q = question.strip()
    
    # Fraction op fraction: "1/2 + 1/3 = ?"
    frac_pattern = re.search(r'^(\d+/\d+)\s*([+\-×÷])\s*(\d+/\d+)\s*=\s*[?？]', q)
    if frac_pattern:
        a = parse_fraction(frac_pattern.group(1))
        op = frac_pattern.group(2)
        b = parse_fraction(frac_pattern.group(3))
        if a is not None and b is not None:
            if op == '+': r = a + b
            elif op == '-': r = a - b
            elif op == '×': r = a * b
            elif op == '÷':
                if b == 0: return None
                r = a / b
            else: return None
            return fraction_to_str(r)
    
    # Fraction op integer: "2/3 ÷ 4 = ?"
    frac_int_pattern = re.search(r'^(\d+/\d+)\s*([+\-×÷])\s*(\d+)\s*=\s*[?？]', q)
    if frac_int_pattern:
        a = parse_fraction(frac_int_pattern.group(1))
        op = frac_int_pattern.group(2)
        b = Fraction(int(frac_int_pattern.group(3)))
        if a is not None:
            if op == '+': r = a + b
            elif op == '-': r = a - b
            elif op == '×': r = a * b
            elif op == '÷':
                if b == 0: return None
                r = a / b
            else: return None
            return fraction_to_str(r)
    
    # Integer op fraction: "4 × 1/3 = ?"
    int_frac_pattern = re.search(r'^(\d+)\s*([+\-×÷])\s*(\d+/\d+)\s*=\s*[?？]', q)
    if int_frac_pattern:
        a = Fraction(int(int_frac_pattern.group(1)))
        op = int_frac_pattern.group(2)
        b = parse_fraction(int_frac_pattern.group(3))
        if b is not None:
            if op == '+': r = a + b
            elif op == '-': r = a - b
            elif op == '×': r = a * b
            elif op == '÷':
                if b == 0: return None
                r = a / b
            else: return None
            return fraction_to_str(r)
    
    # Decimal or integer arithmetic: "1.5 + 2.3 = ?" or "5 + 3 = ?"
    num_pattern = re.search(r'^(\d+(?:\.\d+)?)\s*([+\-×÷])\s*(\d+(?:\.\d+)?)\s*=\s*[?？]', q)
    if num_pattern:
        try:
            a = Decimal(num_pattern.group(1))
            op = num_pattern.group(2)
            b = Decimal(num_pattern.group(3))
            if op == '+': r = a + b
            elif op == '-': r = a - b
            elif op == '×': r = a * b
            elif op == '÷':
                if b == 0: return None
                # Division: use high precision
                r = a / b
            else: return None
            # Normalize
            r_norm = r.normalize()
            return str(r_norm)
        except:
            pass
    
    return None

def check_division_remainder(question, correct_answer):
    """Returns (expected, got) if mismatch, else None."""
    m = re.search(r'^(\d+)\s*÷\s*(\d+)\s*=\s*[?？]', question.strip())
    if not m:
        return None
    n = int(m.group(1))
    d = int(m.group(2))
    q_val = n // d
    r = n % d
    if r == 0:
        expected = str(q_val)
        if correct_answer.strip() == expected:
            return None
        # Check various forms
        if normalize_number(correct_answer) == normalize_number(expected):
            return None
        return (expected, correct_answer)
    else:
        # Expect "Q あまり R" or similar
        expected_variants = [
            f"{q_val} あまり {r}",
            f"{q_val}あまり{r}",
            f"{q_val} 余り {r}",
            f"{q_val}余り{r}",
            f"{q_val}余{r}",
        ]
        for v in expected_variants:
            if correct_answer.strip() == v:
                return None
        return (f"{q_val} あまり {r}", correct_answer)

def check_file(filepath):
    file_issues = []
    with open(filepath) as f:
        data = json.load(f)
    
    for q in data.get('questions', []):
        qid = q.get('id', '?')
        question = q.get('question', '')
        choices = q.get('choices', [])
        correct_idx = q.get('correct', 0)
        explanation = q.get('explanation', '')
        
        if correct_idx >= len(choices):
            file_issues.append({'id': qid, 'question': question[:60], 'issue': f'correct index {correct_idx} out of range', 'expected': None})
            continue
        
        correct_answer = str(choices[correct_idx])
        
        # Division with remainder
        if '÷' in question and any(x in correct_answer for x in ['あまり', '余']):
            result = check_division_remainder(question, correct_answer)
            if result:
                expected, got = result
                file_issues.append({'id': qid, 'question': question[:80], 'issue': f'Wrong remainder: expected "{expected}", got "{got}"', 'choices': choices, 'correct_idx': correct_idx})
            continue
        
        # Division without remainder (integer result)
        if '÷' in question and re.match(r'^\d+\s*÷\s*\d+\s*=\s*[?？]', question.strip()):
            result = check_division_remainder(question, correct_answer)
            if result:
                expected, got = result
                file_issues.append({'id': qid, 'question': question[:80], 'issue': f'Wrong division: expected "{expected}", got "{got}"', 'choices': choices, 'correct_idx': correct_idx})
            continue
        
        # Basic arithmetic
        expected = extract_math_basic(question)
        if expected is not None:
            if not answers_match(expected, correct_answer):
                # Find which choice has the right answer
                expected_idx = None
                for i, c in enumerate(choices):
                    if answers_match(expected, str(c)):
                        expected_idx = i
                        break
                file_issues.append({
                    'id': qid,
                    'question': question[:80],
                    'issue': f'Wrong answer: expected "{expected}", got "{correct_answer}" (correct_idx={correct_idx})',
                    'expected': expected,
                    'choices': choices,
                    'correct_idx': correct_idx,
                    'expected_idx': expected_idx,
                })
    return file_issues

# Process all math files
all_issues = {}
for f in sorted(MATH_DIR.glob("*.json")):
    issues_in_file = check_file(f)
    if issues_in_file:
        all_issues[str(f)] = issues_in_file

if not all_issues:
    print("✅ No issues found in math files!")
else:
    for filepath, file_issues in all_issues.items():
        fname = os.path.basename(filepath)
        print(f"\n=== {fname} ===")
        for issue in file_issues:
            print(f"  ID: {issue['id']}")
            print(f"  Q:  {issue['question']}")
            print(f"  !! {issue['issue']}")
            if 'choices' in issue:
                print(f"  Choices: {issue['choices']}")
            if 'expected_idx' in issue and issue.get('expected_idx') is not None:
                print(f"  => The correct choice is at index {issue['expected_idx']}")
            print()

print(f"\nTotal files with issues: {len(all_issues)}")
total = sum(len(v) for v in all_issues.values())
print(f"Total issues: {total}")
