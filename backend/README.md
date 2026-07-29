# orcestr-core

Python contracts and FastAPI adapters for the Orcestr API error envelope.

```python
from orcestr_core import ApiError

raise ApiError(
    status_code=409,
    code="order_already_closed",
    message="The order is already closed.",
)
```

Install FastAPI support with `orcestr-core[fastapi]`.

