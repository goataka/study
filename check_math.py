#!/usr/bin/env python3
import json
import re
import os
from fractions import Fraction
from pathlib import Path

MATH_DIR = Path("/home/runner/work/study/study/quiz/public/questions/math")

issues = []

def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def simplify_fraction(num, den):
    if den == 0:
        return None, None
    g = gcd(abs(num), abs(den))
    return num // g, den // g

def parse_fraction(s):
    """Parse 'a/b' or integer string, return Fraction or None"""
    s = s.strip()
    if '/' in s:
        parts = s.split('/')
        if len(parts) == 2:
            try:
                return Fraction(int(parts[0].strip()), int(parts[1].strip()))
            except:
                return None
    try:
        return Fraction(int(s))
    except:
        return None

def fraction_to_str(f):
    """Convert Fraction to minimal string representation"""
    if f.denominator == 1:
        return str(f.numerator)
    return f"{f.numerator}/{f.denominator}"

def extract_math_basic(question):
    """Try to extract and compute basic arithmetic from question text.
    Returns expected answer string or None if can't parse."""
    q = question.strip()
    
    # Pattern: "N + M = ?" or "N - M = ?" or "N × M = ?" or "N ÷ M = ?"
    # Also handles decimals: "1.5 + 2.3 = ?"
    # Fraction arithmetic: "1/2 + 1/3 = ?"
    
    # Remove trailing part after "=" or find the expression
    # Look for patterns like: NUMBER OP NUMBER = ?
    
    # Try fraction arithmetic: e.g., "1/2 + 1/3 = ?"
    frac_pattern = re.search(r'(\d+/\d+)\s*([+\-×÷])\s*(\d+/\d+)\s*=\s*[?？]', q)
    if frac_pattern:
        a = parse_fraction(frac_pattern.group(1))
        op = frac_pattern.group(2)
        b = parse_fraction(frac_pattern.group(3))
        if a is not None and b is not None:
            if op == '+':
                r = a + b
            elif op == '-':
                r = a - b
            elif op == '×':
                r = a * b
            elif op == '÷':
                if b == 0:
                    return None
                r = a / b
            else:
                return None
            return fraction_to_str(r)
    
    # Mixed number fractions like "1と2/3 + 2と1/4 = ?"
    mixed_pattern = re.search(r'(\d+)と(\d+/\d+)\s*([+\-×÷])\s*(\d+)と(\d+/\d+)\s*=\s*[?？]', q)
    if mixed_pattern:
        whole1 = int(mixed_pattern.group(1))
        frac1 = parse_fraction(mixed_pattern.group(2))
        op = mixed_pattern.group(3)
        whole2 = int(mixed_pattern.group(4))
        frac2 = parse_fraction(mixed_pattern.group(5))
        if frac1 and frac2:
            a = Fraction(whole1) + frac1
            b = Fraction(whole2) + frac2
            if op == '+':
                r = a + b
            elif op == '-':
                r = a - b
            elif op == '×':
                r = a * b
            elif op == '÷':
                r = a / b
            else:
                return None
            # Convert to mixed number if > 1
            if r > 1 and r.denominator != 1:
                whole = int(r)
                frac = r - whole
                return f"{whole}と{fraction_to_str(frac)}"
            return fraction_to_str(r)
    
    # Try decimal arithmetic: e.g., "1.5 + 2.3 = ?"
    dec_pattern = re.search(r'(\d+\.\d+)\s*([+\-×÷])\s*(\d+\.\d+)\s*=\s*[?？]', q)
    if dec_pattern:
        a = float(dec_pattern.group(1))
        op = dec_pattern.group(2)
        b = float(dec_pattern.group(3))
        if op == '+':
            r = round(a + b, 10)
        elif op == '-':
            r = round(a - b, 10)
        elif op == '×':
            r = round(a * b, 10)
        elif op == '÷':
            if b == 0:
                return None
            r = round(a / b, 10)
        else:
            return None
        # Format nicely
        if r == int(r):
            return str(int(r))
        return str(r).rstrip('0').rstrip('.')
    
    # Integer with decimal: e.g., "5 + 1.5 = ?" or "1.5 + 3 = ?"
    mixed_dec_pattern = re.search(r'([\d.]+)\s*([+\-×÷])\s*([\d.]+)\s*=\s*[?？]', q)
    if mixed_dec_pattern:
        try:
            a_s = mixed_dec_pattern.group(1)
            op = mixed_dec_pattern.group(2)
            b_s = mixed_dec_pattern.group(3)
            a = float(a_s)
            b = float(b_s)
            if op == '+':
                r = round(a + b, 10)
            elif op == '-':
                r = round(a - b, 10)
            elif op == '×':
                r = round(a * b, 10)
            elif op == '÷':
                if b == 0:
                    return None
                r = round(a / b, 10)
            else:
                return None
            if r == int(r):
                return str(int(r))
            return str(r).rstrip('0').rstrip('.')
        except:
            pass
    
    return None

def check_division_remainder(question, correct_answer):
    """Check division with remainder: 'N ÷ M = ?' where answer is 'Q あまり R' """
    m = re.search(r'(\d+)\s*÷\s*(\d+)\s*=\s*[?？]', question)
    if not m:
        return None
    n = int(m.group(1))
    d = int(m.group(2))
    q = n // d
    r = n % d
    if r == 0:
        # No remainder
        expected = str(q)
    else:
        # Check various remainder formats
        expected_variants = [
            f"{q} あまり {r}",
            f"{q}あまり{r}",
            f"{q} 余り {r}",
            f"{q}余り{r}",
            f"{q}余{r}",
        ]
        if correct_answer in expected_variants:
            return None  # OK
        return (expected_variants[0], correct_answer)
    if correct_answer == expected:
        return None
    return (expected, correct_answer)

def normalize_answer(s):
    """Normalize answer string for comparison"""
    return s.strip().replace(' ', '').replace('　', '')

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
            file_issues.append({
                'id': qid,
                'question': question[:60],
                'issue': f'correct index {correct_idx} out of range (choices len={len(choices)})',
                'correct_answer': None,
                'expected': None,
            })
            continue
        
        correct_answer = choices[correct_idx]
        
        # Check division with remainder first
        if '÷' in question and ('あまり' in correct_answer or '余' in correct_answer):
            result = check_division_remainder(question, correct_answer)
            if result:
                expected, got = result
                file_issues.append({
                    'id': qid,
                    'question': question[:80],
                    'issue': f'Wrong remainder answer: expected "{expected}", got "{got}"',
                    'correct_answer': correct_answer,
                    'expected': expected,
                    'choices': choices,
                })
            continue
        
        # Try basic arithmetic
        expected = extract_math_basic(question)
        if expected is not None:
            # Compare
            if normalize_answer(str(expected)) != normalize_answer(str(correct_answer)):
                # Maybe answer has different format but same value
                # Try Fraction comparison
                try:
                    ef = Fraction(expected.replace('と', ' ')) if 'と' not in expected else None
                    cf = None
                    if ef is not None:
                        cf_str = correct_answer.strip()
                        if '/' in cf_str:
                            cf = Fraction(cf_str)
                        else:
                            cf = Fraction(int(cf_str))
                    if ef is not None and cf is not None and ef == cf:
                        pass  # Same value, different format
                    else:
                        # Find what index has the expected answer
                        expected_idx = None
                        for i, c in enumerate(choices):
                            if normalize_answer(str(c)) == normalize_answer(str(expected)):
                                expected_idx = i
                                break
                        file_issues.append({
                            'id': qid,
                            'question': question[:80],
                            'issue': f'Wrong answer: expected "{expected}", got "{correct_answer}" (correct idx={correct_idx})',
                            'correct_answer': correct_answer,
                            'expected': expected,
                            'choices': choices,
                            'expected_idx': expected_idx,
                        })
                except:
                    file_issues.append({
                        'id': qid,
                        'question': question[:80],
                        'issue': f'Wrong answer: expected "{expected}", got "{correct_answer}" (correct idx={correct_idx})',
                        'correct_answer': correct_answer,
                        'expected': expected,
                        'choices': choices,
                    })
    return file_issues

# Process all math files
all_issues = {}
for f in sorted(MATH_DIR.glob("*.json")):
    issues_in_file = check_file(f)
    if issues_in_file:
        all_issues[str(f)] = issues_in_file

# Report
if not all_issues:
    print("No issues found in math files!")
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
            if 'expected_idx' in issue:
                print(f"  Expected index: {issue.get('expected_idx')}")
            print()

print(f"\nTotal files with issues: {len(all_issues)}")
total = sum(len(v) for v in all_issues.values())
print(f"Total issues: {total}")
