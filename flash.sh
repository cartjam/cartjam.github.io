#!/bin/sh
# Writes a cartjam release to a microSD card, on macOS or Linux:
#
#   curl -fsSL https://cartjam.github.io/flash.sh | sh -s -- k36 v0.1.0
#
# or an image you already have:
#
#   sh flash.sh --image cartjam-k36-v0.1.0.img.xz
#
# It only offers removable disks, checks the download against the release's checksum, and
# asks you to type the disk's name before it erases anything.
set -eu

REPO=cartjam/cartjam.github.io

die() {
    echo "flash: $*" >&2
    exit 1
}

usage() {
    die "usage: flash.sh CONSOLE RELEASE, flash.sh --image FILE.img.xz [--to FILE], or flash.sh --list"
}

image= to= only_list=
case ${1:-} in
--list) only_list=1 ;;
--image)
    [ $# -ge 2 ] || usage
    image=$2
    shift 2
    ;;
"" | -*) usage ;;
*)
    [ $# -ge 2 ] || usage
    console=$1 release=$2
    shift 2
    ;;
esac
if [ "${1:-}" = --to ]; then # write to a file instead of a card, for testing
    [ $# -eq 2 ] || usage
    to=$2
fi

[ -n "$only_list" ] || command -v xz > /dev/null || die "needs xz (on macOS: brew install xz; on Linux: your package manager's xz-utils or xz)"

sum() {
    if command -v sha256sum > /dev/null; then
        sha256sum "$1" | cut -d' ' -f1
    else
        shasum -a 256 "$1" | cut -d' ' -f1
    fi
}

tmp=
trap '[ -z "$tmp" ] || rm -rf "$tmp"' EXIT

if [ -z "$image" ] && [ -z "$only_list" ]; then
    command -v curl > /dev/null || die "needs curl"
    tmp=$(mktemp -d)
    name=cartjam-$console-$release.img.xz
    base=https://github.com/$REPO/releases/download/$release
    echo "Downloading $name"
    curl -fL --progress-bar -o "$tmp/$name" "$base/$name" || die "couldn't download $base/$name"
    curl -fsSL -o "$tmp/$name.sha256" "$base/$name.sha256" || die "couldn't download its checksum"
    [ "$(sum "$tmp/$name")" = "$(cut -d' ' -f1 "$tmp/$name.sha256")" ] || die "the download is damaged: its checksum doesn't match"
    echo "Checksum matches"
    image=$tmp/$name
fi
[ -n "$only_list" ] || [ -r "$image" ] || die "can't read $image"

# Removable disks, one per line: device, then a description.
cards_macos() {
    for d in $(diskutil list | awk '/^\/dev\/disk[0-9]+/ {print $1}'); do
        info=$(diskutil info "$d")
        echo "$info" | grep -Eq 'Virtual: +Yes' && continue
        echo "$info" | grep -Eq 'Removable Media: +Removable|Device Location: +External' || continue
        size=$(echo "$info" | awk -F: '/Disk Size/ {print $2}' | sed 's/ *(.*//; s/^ *//')
        media=$(echo "$info" | awk -F: '/Media Name/ {print $2}' | sed 's/^ *//')
        echo "$d $size, $media"
    done
}

cards_linux() {
    rootdisk=$(lsblk -no PKNAME "$(findmnt -no SOURCE /)" 2> /dev/null | head -n 1)
    for name in $(lsblk -dpno NAME); do
        [ "$(lsblk -dno TYPE "$name")" = disk ] || continue
        [ "${name#/dev/}" != "$rootdisk" ] || continue
        case $name in
        /dev/mmcblk*) ;;
        *)
            [ "$(lsblk -dno RM "$name" | tr -d ' ')" = 1 ] || [ "$(lsblk -dno TRAN "$name" | tr -d ' ')" = usb ] || continue
            ;;
        esac
        model=$(lsblk -dno MODEL "$name" | sed 's/ *$//')
        echo "$name $(lsblk -dno SIZE "$name" | tr -d ' '), ${model:-card}"
    done
}

ask() {
    printf '%s' "$1" > /dev/tty
    read -r answer < /dev/tty
}

if [ -n "$to" ]; then
    xz -dc "$image" > "$to"
    echo "Wrote $to"
    exit 0
fi

case $(uname -s) in
Darwin) list=$(cards_macos) ;;
Linux) list=$(cards_linux) ;;
*) die "this script is for macOS and Linux; on Windows use balenaEtcher" ;;
esac
[ -n "$list" ] || die "no removable disk found. Is the card in?"
if [ -n "$only_list" ]; then
    echo "$list"
    exit 0
fi

echo
echo "Removable disks:"
echo "$list" | sed 's/^/  /'
echo
ask "Disk to erase, as listed (like $(echo "$list" | head -n 1 | cut -d' ' -f1)): "
disk=$answer
echo "$list" | cut -d' ' -f1 | grep -qx "$disk" || die "$disk isn't one of the removable disks"
ask "Everything on $disk will be erased. Type its name again to go on: "
[ "$answer" = "$disk" ] || die "that's not the same name; nothing was changed"

echo "Writing. This needs your password, and takes a few minutes."
sudo -v
case $(uname -s) in
Darwin)
    diskutil unmountDisk "$disk" > /dev/null
    raw=$(echo "$disk" | sed 's#/dev/disk#/dev/rdisk#')
    xz -dc "$image" | sudo dd of="$raw" bs=4m status=progress
    sync
    diskutil eject "$disk" > /dev/null || true
    ;;
Linux)
    for part in $(lsblk -lnpo NAME "$disk"); do
        sudo umount "$part" 2> /dev/null || true
    done
    xz -dc "$image" | sudo dd of="$disk" bs=4M conv=fsync status=progress
    sync
    ;;
esac
echo "Done. Put the card in your console's first slot and switch it on."
