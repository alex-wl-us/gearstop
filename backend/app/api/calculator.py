import ast
import math

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/calculate", tags=["calculator"])

# Allowed names for evaluation: scientific functions and constants
_ALLOWED_FUNCS = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "asin": math.asin,
    "acos": math.acos,
    "atan": math.atan,
    "log": math.log10,
    "ln": math.log,
    "sqrt": math.sqrt,
    "abs": abs,
    "exp": math.exp,
    "pow": math.pow,
}
_ALLOWED_CONSTS = {
    "pi": math.pi,
    "e": math.e,
}


class CalculateRequest(BaseModel):
    expression: str


class CalculateResponse(BaseModel):
    expression: str
    result: float


class CalculatorError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


# Only these AST node types are permitted in a parsed expression
_ALLOWED_NODES = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Call,
    ast.Name,
    ast.Constant,
    ast.Load,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Pow,
    ast.Mod,
    ast.USub,
    ast.UAdd,
)


def _validate(node: ast.AST) -> None:
    if not isinstance(node, _ALLOWED_NODES):
        raise CalculatorError(f"Unsupported expression syntax: {type(node).__name__}")
    for child in ast.iter_child_nodes(node):
        if isinstance(node, ast.Call):
            if not (isinstance(node.func, ast.Name) and node.func.id in _ALLOWED_FUNCS):
                raise CalculatorError("Unsupported function call")
            for arg in node.args:
                _validate(arg)
            continue
        _validate(child)


def _eval(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _eval(node.body)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return float(node.value)
        raise CalculatorError("Invalid literal in expression")
    if isinstance(node, ast.Name):
        if node.id in _ALLOWED_CONSTS:
            return _ALLOWED_CONSTS[node.id]
        raise CalculatorError(f"Unknown identifier: {node.id}")
    if isinstance(node, ast.BinOp):
        left = _eval(node.left)
        right = _eval(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            if right == 0:
                raise CalculatorError("Division by zero")
            return left / right
        if isinstance(node.op, ast.Pow):
            return left ** right
        if isinstance(node.op, ast.Mod):
            if right == 0:
                raise CalculatorError("Division by zero")
            return left % right
        raise CalculatorError("Unsupported operator")
    if isinstance(node, ast.UnaryOp):
        val = _eval(node.operand)
        if isinstance(node.op, ast.USub):
            return -val
        if isinstance(node.op, ast.UAdd):
            return val
        raise CalculatorError("Unsupported unary operator")
    if isinstance(node, ast.Call):
        func = _ALLOWED_FUNCS[node.func.id]
        args = [_eval(a) for a in node.args]
        try:
            return float(func(*args))
        except ValueError as exc:
            raise CalculatorError(f"Math error: {exc}") from exc
    raise CalculatorError("Unsupported expression")


def evaluate_expression(expression: str) -> float:
    cleaned = expression.strip()
    if not cleaned:
        raise CalculatorError("Expression is empty")
    cleaned = cleaned.replace("\u00f7", "/").replace("\u00d7", "*").replace("^", "**")
    try:
        tree = ast.parse(cleaned, mode="eval")
    except SyntaxError as exc:
        raise CalculatorError("Invalid expression syntax") from exc
    _validate(tree)
    try:
        result = _eval(tree)
    except ZeroDivisionError as exc:
        raise CalculatorError("Division by zero") from exc
    except OverflowError as exc:
        raise CalculatorError("Result too large") from exc
    if isinstance(result, complex):
        raise CalculatorError("Result is not a real number")
    if math.isnan(result) or math.isinf(result):
        raise CalculatorError("Result is undefined")
    return result


@router.post("", response_model=CalculateResponse)
def calculate(payload: CalculateRequest):
    try:
        result = evaluate_expression(payload.expression)
    except CalculatorError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail=exc.message) from exc
    return CalculateResponse(expression=payload.expression, result=result)
