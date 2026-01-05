import React from "react";
import { twMerge } from "tailwind-merge";

import PlusIcon from "./plus.svg";
import CloseIcon from "./close.svg";
import BoxIcon from "./box.svg";
import CheckCircleIcon from "./check-circle.svg";
import AlertIcon from "./alert.svg";
import InfoIcon from "./info.svg";
import ErrorIcon from "./info-hexa.svg";
import BoltIcon from "./bolt.svg";
import ArrowUpIcon from "./arrow-up.svg";
import ArrowDownIcon from "./arrow-down.svg";
import FolderIcon from "./folder.svg";
import VideoIcon from "./videos.svg";
import AudioIcon from "./audio.svg";
import GridIcon from "./grid.svg";
import FileIcon from "./file.svg";
import DownloadIcon from "./download.svg";
import ArrowRightIcon from "./arrow-right.svg";
import GroupIcon from "./group.svg";
import BoxIconLine from "./box-line.svg";
import ShootingStarIcon from "./shooting-star.svg";
import DollarLineIcon from "./dollar-line.svg";
import TrashBinIcon from "./trash.svg";
import AngleUpIcon from "./angle-up.svg";
import AngleDownIcon from "./angle-down.svg";
import PencilIcon from "./pencil.svg";
import CheckLineIcon from "./check-line.svg";
import CloseLineIcon from "./close-line.svg";
import ChevronDownIcon from "./chevron-down.svg";
import ChevronUpIcon from "./chevron-up.svg";
import PaperPlaneIcon from "./paper-plane.svg";
import LockIcon from "./lock.svg";
import EnvelopeIcon from "./envelope.svg";
import UserIcon from "./user-line.svg";
import CalenderIcon from "./calender-line.svg";
import EyeIcon from "./eye.svg";
import EyeCloseIcon from "./eye-close.svg";
import TimeIcon from "./time.svg";
import CopyIcon from "./copy.svg";
import ChevronLeftIcon from "./chevron-left.svg";
import UserCircleIcon from "./user-circle.svg";
import TaskIcon from "./task-icon.svg";
import ListIcon from "./list.svg";
import TableIcon from "./table.svg";
import PageIcon from "./page.svg";
import PieChartIcon from "./pie-chart.svg";
import BoxCubeIcon from "./box-cube.svg";
import PlugInIcon from "./plug-in.svg";
import DocsIcon from "./docs.svg";
import MailIcon from "./mail-line.svg";
import HorizontalDots from "./horizontal-dots.svg";
import ChatIcon from "./chat.svg";
import MoreDotIcon from "./more-dot.svg";
import BellIcon from "./bell.svg";
import FilterIcon from "./filter.svg";
import SearchIcon from "./search.svg";
import GearIcon from "./gear.svg";
import PinIcon from "./pin.svg";
import PinOffIcon from "./pin-off.svg";
import PhoneIcon from "./phone.svg";
import LogoutIcon from "./logout.svg";

type SvgIconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

function withIconDefaults(Icon: SvgIconComponent) {
  const Wrapped: SvgIconComponent = ({ className, style, ...props }) => (
    <Icon
      data-st-icon="true"
      className={twMerge("h-5 w-5", className)}
      style={{ overflow: "visible", ...style }}
      {...props}
    />
  );
  return Wrapped;
}

const StSearchIcon = withIconDefaults(SearchIcon);
const StFilterIcon = withIconDefaults(FilterIcon);
const StDownloadIcon = withIconDefaults(DownloadIcon);
const StBellIcon = withIconDefaults(BellIcon);
const StMoreDotIcon = withIconDefaults(MoreDotIcon);
const StFileIcon = withIconDefaults(FileIcon);
const StGridIcon = withIconDefaults(GridIcon);
const StAudioIcon = withIconDefaults(AudioIcon);
const StVideoIcon = withIconDefaults(VideoIcon);
const StBoltIcon = withIconDefaults(BoltIcon);
const StPlusIcon = withIconDefaults(PlusIcon);
const StBoxIcon = withIconDefaults(BoxIcon);
const StCloseIcon = withIconDefaults(CloseIcon);
const StCheckCircleIcon = withIconDefaults(CheckCircleIcon);
const StAlertIcon = withIconDefaults(AlertIcon);
const StInfoIcon = withIconDefaults(InfoIcon);
const StErrorIcon = withIconDefaults(ErrorIcon);
const StArrowUpIcon = withIconDefaults(ArrowUpIcon);
const StFolderIcon = withIconDefaults(FolderIcon);
const StArrowDownIcon = withIconDefaults(ArrowDownIcon);
const StArrowRightIcon = withIconDefaults(ArrowRightIcon);
const StGroupIcon = withIconDefaults(GroupIcon);
const StBoxIconLine = withIconDefaults(BoxIconLine);
const StShootingStarIcon = withIconDefaults(ShootingStarIcon);
const StDollarLineIcon = withIconDefaults(DollarLineIcon);
const StTrashBinIcon = withIconDefaults(TrashBinIcon);
const StAngleUpIcon = withIconDefaults(AngleUpIcon);
const StAngleDownIcon = withIconDefaults(AngleDownIcon);
const StPencilIcon = withIconDefaults(PencilIcon);
const StCheckLineIcon = withIconDefaults(CheckLineIcon);
const StCloseLineIcon = withIconDefaults(CloseLineIcon);
const StChevronDownIcon = withIconDefaults(ChevronDownIcon);
const StPaperPlaneIcon = withIconDefaults(PaperPlaneIcon);
const StEnvelopeIcon = withIconDefaults(EnvelopeIcon);
const StLockIcon = withIconDefaults(LockIcon);
const StUserIcon = withIconDefaults(UserIcon);
const StCalenderIcon = withIconDefaults(CalenderIcon);
const StEyeIcon = withIconDefaults(EyeIcon);
const StEyeCloseIcon = withIconDefaults(EyeCloseIcon);
const StTimeIcon = withIconDefaults(TimeIcon);
const StCopyIcon = withIconDefaults(CopyIcon);
const StChevronLeftIcon = withIconDefaults(ChevronLeftIcon);
const StUserCircleIcon = withIconDefaults(UserCircleIcon);
const StListIcon = withIconDefaults(ListIcon);
const StTableIcon = withIconDefaults(TableIcon);
const StPageIcon = withIconDefaults(PageIcon);
const StTaskIcon = withIconDefaults(TaskIcon);
const StPieChartIcon = withIconDefaults(PieChartIcon);
const StBoxCubeIcon = withIconDefaults(BoxCubeIcon);
const StPlugInIcon = withIconDefaults(PlugInIcon);
const StDocsIcon = withIconDefaults(DocsIcon);
const StMailIcon = withIconDefaults(MailIcon);
const StHorizontalDots = withIconDefaults(HorizontalDots);
const StChevronUpIcon = withIconDefaults(ChevronUpIcon);
const StChatIcon = withIconDefaults(ChatIcon);
const StGearIcon = withIconDefaults(GearIcon);
const StPinIcon = withIconDefaults(PinIcon);
const StPinOffIcon = withIconDefaults(PinOffIcon);
const StPhoneIcon = withIconDefaults(PhoneIcon);
const StLogoutIcon = withIconDefaults(LogoutIcon);

export {
  StSearchIcon as SearchIcon,
  StFilterIcon as FilterIcon,
  StDownloadIcon as DownloadIcon,
  StBellIcon as BellIcon,
  StMoreDotIcon as MoreDotIcon,
  StFileIcon as FileIcon,
  StGridIcon as GridIcon,
  StAudioIcon as AudioIcon,
  StVideoIcon as VideoIcon,
  StBoltIcon as BoltIcon,
  StPlusIcon as PlusIcon,
  StBoxIcon as BoxIcon,
  StCloseIcon as CloseIcon,
  StCheckCircleIcon as CheckCircleIcon,
  StAlertIcon as AlertIcon,
  StInfoIcon as InfoIcon,
  StErrorIcon as ErrorIcon,
  StArrowUpIcon as ArrowUpIcon,
  StFolderIcon as FolderIcon,
  StArrowDownIcon as ArrowDownIcon,
  StArrowRightIcon as ArrowRightIcon,
  StGroupIcon as GroupIcon,
  StBoxIconLine as BoxIconLine,
  StShootingStarIcon as ShootingStarIcon,
  StDollarLineIcon as DollarLineIcon,
  StTrashBinIcon as TrashBinIcon,
  StAngleUpIcon as AngleUpIcon,
  StAngleDownIcon as AngleDownIcon,
  StPencilIcon as PencilIcon,
  StCheckLineIcon as CheckLineIcon,
  StCloseLineIcon as CloseLineIcon,
  StChevronDownIcon as ChevronDownIcon,
  StPaperPlaneIcon as PaperPlaneIcon,
  StEnvelopeIcon as EnvelopeIcon,
  StLockIcon as LockIcon,
  StUserIcon as UserIcon,
  StCalenderIcon as CalenderIcon,
  StEyeIcon as EyeIcon,
  StEyeCloseIcon as EyeCloseIcon,
  StTimeIcon as TimeIcon,
  StCopyIcon as CopyIcon,
  StChevronLeftIcon as ChevronLeftIcon,
  StUserCircleIcon as UserCircleIcon,
  StListIcon as ListIcon,
  StTableIcon as TableIcon,
  StPageIcon as PageIcon,
  StTaskIcon as TaskIcon,
  StPieChartIcon as PieChartIcon,
  StBoxCubeIcon as BoxCubeIcon,
  StPlugInIcon as PlugInIcon,
  StDocsIcon as DocsIcon,
  StMailIcon as MailIcon,
  StHorizontalDots as HorizontalDots,
  StChevronUpIcon as ChevronUpIcon,
  StChatIcon as ChatIcon,
  StGearIcon as GearIcon,
  StPinIcon as PinIcon,
  StPinOffIcon as PinOffIcon,
  StPhoneIcon as PhoneIcon,
  StLogoutIcon as LogoutIcon,
};
