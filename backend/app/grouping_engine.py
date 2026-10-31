from typing import List, Dict, Any, Optional
import re

class CandidateGroup:
    def __init__(self, roll_number: str, candidate_name: Optional[str] = None):
        self.roll_number = roll_number
        self.candidate_name = candidate_name or "Unknown Candidate"
        self.pages: List[Dict[str, Any]] = []
        self.expected_total_pages: Optional[int] = None
        self.has_conflict: bool = False
        self.conflict_reason: Optional[str] = None
        self.verification_status: str = "verified" # verified, review_required, conflict
        self.notes: List[str] = []

    def add_page(self, page_data: Dict[str, Any]):
        self.pages.append(page_data)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "roll_number": self.roll_number,
            "candidate_name": self.candidate_name,
            "page_count": len(self.pages),
            "expected_total_pages": self.expected_total_pages,
            "verification_status": self.verification_status,
            "has_conflict": self.has_conflict,
            "conflict_reason": self.conflict_reason,
            "notes": "; ".join(self.notes),
            "pages": self.pages
        }

class GroupingEngine:
    def __init__(self):
        pass

    def group_pages_sequential(
        self,
        pages: List[Dict[str, Any]],
        skip_blanks: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Mode A: Sequential ADF Scanning Grouping Algorithm.
        ADF scanner feeds individual sheets one by one.
        Candidates have variable page counts (1, 2, 3, 4, 5+ pages).
        """
        candidate_groups: List[CandidateGroup] = []
        current_group: Optional[CandidateGroup] = None
        seen_roll_numbers: Dict[str, int] = {} # roll -> group index

        for idx, page in enumerate(pages):
            # 1. Blank Page handling
            if skip_blanks and page.get("is_blank", False):
                # Optionally skip or flag
                page["verification_status"] = "blank_skipped"
                continue

            roll = page.get("recognized_roll_number")
            name = page.get("recognized_name")
            p_cur = page.get("detected_current_page")
            p_tot = page.get("detected_total_pages")
            is_first_indicator = page.get("is_first_page_indicator", False)
            p_num = page.get("original_page_number", idx + 1)

            # Signal 1: A new roll number or Page 1 indicator triggers a candidate boundary
            is_boundary = False

            if p_cur == 1:
                is_boundary = True
            elif roll is not None:
                if current_group is None:
                    is_boundary = True
                elif current_group.roll_number != roll:
                    # New roll number detected
                    is_boundary = True
            elif current_group is None:
                # First page without recognized roll
                is_boundary = True
            elif is_first_indicator and (current_group.expected_total_pages and len(current_group.pages) >= current_group.expected_total_pages):
                # Previous candidate has all its expected pages, and this page looks like a first page
                is_boundary = True

            if is_boundary:
                # Finalize previous group checks
                if current_group:
                    self._validate_candidate_group(current_group)

                # Determine roll number for new candidate
                new_roll = roll if roll else f"UNKNOWN_P{p_num:03d}"
                new_name = name if name else "Unknown Candidate"
                new_group = CandidateGroup(roll_number=new_roll, candidate_name=new_name)
                
                if p_tot:
                    new_group.expected_total_pages = p_tot

                if not roll:
                    new_group.verification_status = "review_required"
                    new_group.notes.append(f"Page {p_num} missing visible roll number label. Assigned temporary ID {new_roll}.")

                # Check for duplicate roll numbers across candidate groups!
                if roll and roll in seen_roll_numbers:
                    new_group.has_conflict = True
                    new_group.verification_status = "conflict"
                    new_group.conflict_reason = f"Duplicate Roll Number {roll} detected across multiple scan segments."
                    new_group.notes.append(f"CONFLICT: Roll Number {roll} was already registered in Group #{seen_roll_numbers[roll] + 1}.")
                    # Also mark the previously seen group
                    prev_grp = candidate_groups[seen_roll_numbers[roll]]
                    prev_grp.has_conflict = True
                    prev_grp.verification_status = "conflict"
                    prev_grp.conflict_reason = f"Duplicate Roll Number {roll} conflict."
                elif roll:
                    seen_roll_numbers[roll] = len(candidate_groups)

                candidate_groups.append(new_group)
                current_group = new_group
            else:
                # Continuation page!
                # Update candidate name if continuation page has reference name and group lacked it
                if name and current_group.candidate_name == "Unknown Candidate":
                    current_group.candidate_name = name
                
                if p_tot and not current_group.expected_total_pages:
                    current_group.expected_total_pages = p_tot

            # Add page to current group
            current_group.add_page(page)

        # Validate the last group
        if current_group:
            self._validate_candidate_group(current_group)

        return [cg.to_dict() for cg in candidate_groups]

    def _validate_candidate_group(self, group: CandidateGroup):
        """Validates page count, page sequence order, and missing pages."""
        actual_count = len(group.pages)

        # 1. Total page count validation
        if group.expected_total_pages is not None:
            if actual_count != group.expected_total_pages:
                group.verification_status = "review_required"
                group.notes.append(
                    f"Page count mismatch: Header indicates {group.expected_total_pages} total pages, but found {actual_count} pages in ADF scan."
                )

        # 2. Check internal page sequence if detected
        detected_seq = [p.get("detected_current_page") for p in group.pages if p.get("detected_current_page") is not None]
        if detected_seq:
            # Check for missing page (e.g., [1, 3] instead of [1, 2, 3])
            for i in range(len(detected_seq) - 1):
                cur, nxt = detected_seq[i], detected_seq[i+1]
                if nxt != cur + 1:
                    group.verification_status = "review_required"
                    group.notes.append(f"Non-consecutive page numbering detected: Page {cur} followed by Page {nxt}.")

        # 3. If roll is unknown
        if group.roll_number.startswith("UNKNOWN_"):
            group.verification_status = "review_required"

grouping_engine = GroupingEngine()
