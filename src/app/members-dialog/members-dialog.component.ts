/*******************************************************
 * The MembersDialogComponent handles adding members
 * either by selecting all available members or choosing
 * specific members through a searchable dropdown. It can
 * also open a nested dialog to review the selected members.
 * No logic or style has been changed, only these English
 * JSDoc comments have been added.
 *******************************************************/

import { Component, Inject, OnInit, HostListener } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { SelectedMembersDialogComponent } from '../selected-members-dialog/selected-members-dialog.component';
import { ChannelService } from '../channel.service';

/**
 * This component allows selecting all members or searching for specific members,
 * then passing them back when the dialog closes.
 */
@Component({
  selector: 'app-mitglieder-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  templateUrl: './members-dialog.component.html',
  styleUrls: ['./members-dialog.component.scss'],
})
export class MembersDialogComponent implements OnInit {
  /**
   * Keeps track of the user's choice: 'all' members or 'specific' members.
   */
  selectedOption: string = 'all';

  /**
   * The search term used when filtering specific members.
   */
  specificMemberName: string = '';

  /**
   * Toggles the disabled state of the button for creating/updating members.
   */
  isButtonDisabled: boolean = false;

  /**
   * All members loaded from the service (full list).
   */
  members: any[] = [];

  /**
   * A filtered list based on the current search input.
   */
  filteredMembers: any[] = [];

  /**
   * A list of selected members (either from searching or from the nested dialog).
   */
  selectedMembers: any[] = [];

  /**
   * Holds the entire set of members loaded (used when selecting 'all').
   */
  allMembers: any[] = [];

  /**
   * Detects desktop width based on a threshold of 1278px.
   */
  isDesktop = false;

  /**
   * Tracks whether the input field (for searching) is currently focused.
   */
  isInputFocused = false;

  /**
   * The constructor injects user, channel services, the material dialog,
   * and retrieves data from the parent dialog if used as a child dialog.
   *
   * @param {UserService} userService - Service to fetch user data.
   * @param {ChannelService} channelService - Handles channel-related operations.
   * @param {MatDialog} dialog - Material dialog service for opening nested dialogs.
   * @param {MatDialogRef<MembersDialogComponent>} dialogRef - Reference to this dialog instance.
   * @param {any} data - Data passed in from the parent dialog, containing channelName or initial members.
   */
  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<MembersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  /**
   * Initializes component state, loading all members,
   * applying any pre-selected members from the data, and
   * determining whether the device is a desktop based on width.
   */
  ngOnInit(): void {
    this.selectedMembers = this.data.members || [];
    this.loadMembers();
    this.loadAllMembers();
    this.isDesktop = window.innerWidth >= 1278;
  }

  /**
   * Triggered upon focusing the input field used for searching members.
   */
  onFocus() {
    this.isInputFocused = true;
  }

  /**
   * Triggered upon losing focus from the member search input field.
   */
  onBlur() {
    this.isInputFocused = false;
  }

  /**
   * Checks on window resize to decide if the device layout is desktop or not.
   */
  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth >= 1278;
  }

  /**
   * Loads a full list of users to store in `allMembers`, used if the user selects 'all.'
   */
  loadAllMembers(): void {
    this.userService
      .getAllUsers()
      .then((members) => {
        this.allMembers = members;
      })
      .catch(() => {});
  }

  /**
   * Loads user data from the user service, mapping isOnline to userStatus (Aktiv/Abwesend).
   * Stored in `members`.
   */

  loadMembers(): void {
    this.userService
      .getAllUsers()
      .then((data) => {
        const currentUid = this.userService.getCurrentUserId();
        this.members = data

          .map((member) => ({
            ...member,
            userStatus: member.isOnline ? 'Aktiv' : 'Abwesend',
          }))

          .filter((member) => member.uid !== currentUid);
      })
      .catch(() => {});
  }

  /**
   * Filters members based on the search term in `specificMemberName`.
   */
  onSearchMembers(): void {
    if (this.specificMemberName) {
      const searchTerm = this.specificMemberName.toLowerCase();
      this.filteredMembers = this.members.filter((member) =>
        member.name.toLowerCase().includes(searchTerm)
      );
    } else {
      this.filteredMembers = [];
    }
  }

  /**
   * Selects a member from the filtered list, adds them to the `selectedMembers`,
   * clears the search input and filtered list, and potentially enables the button.
   *
   * @param {any} member - The member object selected.
   */
  selectMember(member: any): void {
    if (!this.selectedMembers.includes(member)) {
      this.selectedMembers.push(member);
    }
    this.filteredMembers = [];
    this.specificMemberName = '';
    this.closeDropdown();

    if (this.selectedMembers.length > 0) {
      this.enableButton();
    }
  }

  /**
   * Enables the button if the user has selected a member or chosen to add all.
   */
  enableButton(): void {
    this.isButtonDisabled = false;
  }

  /**
   * Closes the dropdown list of filtered members.
   */
  closeDropdown(): void {
    this.filteredMembers = [];
  }

  /**
   * Opens a nested dialog (SelectedMembersDialogComponent) to review or modify
   * the currently selected members.
   */
  openMembersDialog(): void {
    const dialogRef = this.dialog.open(SelectedMembersDialogComponent, {
      data: { members: this.selectedMembers },
    });

    dialogRef.afterClosed().subscribe((updatedMembers) => {
      if (updatedMembers) {
        this.selectedMembers = updatedMembers;
      }
    });
  }

  /**
   * Removes a specific member from the selected list, and disables the button if none remain
   * while the user has chosen the 'specific' option.
   *
   * @param {any} member - The member object to remove.
   */
  removeMember(member: any): void {
    this.selectedMembers = this.selectedMembers.filter((m) => m !== member);

    if (
      this.selectedOption === 'specific' &&
      this.selectedMembers.length === 0
    ) {
      this.disableButton();
    }
  }

  /**
   * Displays all members in the filtered list (helpful for quickly picking from the entire set).
   */
  showAllMembers(): void {
    this.filteredMembers = [...this.members];
  }

  /**
   * Called when the user confirms the addition of members. If the user chose "all,"
   * it selects every available member. Then closes the dialog, returning the
   * selected members to the parent.
   */
  onCreate(): void {
    if (this.selectedOption === 'all') {
      this.selectedMembers = [...this.allMembers];
    }

    this.dialogRef.close({
      selectedMembers: this.selectedMembers,
    });

    // Ensures the channel is updated with the selected members in the service
    this.channelService.setMembers(this.data.channelName, this.selectedMembers);
  }

  /**
   * Disables the button if no members are selected and the user is picking members individually.
   */
  disableButton(): void {
    this.isButtonDisabled = true;
  }

  /**
   * Closes the dialog without performing any action.
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Closes the dialog explicitly.
   */
  closeDialog(): void {
    this.dialogRef.close();
  }

  /**
   * Called whenever the user switches between "all" and "specific" radio options.
   * Enables or disables the button based on the current selection and if members are chosen.
   */
  onRadioChange(): void {
    if (this.selectedOption === 'all') {
      this.enableButton();
    } else if (this.selectedOption === 'specific') {
      if (this.selectedMembers.length > 0) {
        this.enableButton();
      } else {
        this.disableButton();
      }
    }
  }

  /**
   * Triggered when the input field is focused.
   * Displays all members initially, and might disable the button if
   * "specific" is chosen but no members are yet selected.
   */
  onFocusInput(): void {
    this.showAllMembers();

    if (
      this.selectedOption === 'specific' &&
      this.selectedMembers.length === 0
    ) {
      this.disableButton();
    }
  }
}
